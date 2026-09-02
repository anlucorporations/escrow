// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TrueKeate Escrow
 * @notice Custodia NFTs/ERC20 durante un trueque (intercambio AtoA) hasta que AMBAS partes
 *         firmen la recepción correcta de lo negociado (RF-05.2). La blockchain es la única
 *         fuente de verdad de los estados del escrow (RNF-01.1).
 *
 * @dev Ciclo 1 (Fase 3): máquina de estados base
 *         CREADO/ACTIVO → CUSTODIADO → APERTURA → COMPLETADO
 *      - Apertura dual con ventanas: |aperturaX − horaPautada| ≤ 10 min y
 *        |aperturaB − aperturaA| ≤ 10 min (RF-05.7, R5).
 *      - Liberación solo con firmas de recepción de ambas partes + marcador de valoración
 *        (invariante I1; D36: detalle off-chain, marcador on-chain).
 *      - Cancelación unilateral solo ANTES de custodiar activos (D31, RF-05.3).
 *      - Disputas/anulación con quórum de Socios (EN_DISPUTA/RESOLUCION_SOCIOS/ANULADO) y
 *        bloqueo (BLOQUEADO) se incorporan en ciclos posteriores (C8).
 *
 * Trazabilidad: RF-05.1…RF-05.7, R5, D31, D36, CU-11…CU-15.
 */
contract Escrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ------------------------------------------------------------------ constantes
    /// @dev Ventana de apertura: ±10 minutos de la hora pautada (RF-05.7, R5).
    uint256 public constant VENTANA_APERTURA = 10 minutes;
    /// @dev Diferencia máxima entre aperturas de ambas partes (RF-05.7, R5).
    uint256 public constant MAX_DIFERENCIA_APERTURAS = 10 minutes;

    // ------------------------------------------------------------------ tipos
    /// @dev Estados canónicos del escrow (diccionario: enum de 9 estados).
    enum Estado {
        CREADO,            // Acuerdo registrado, sin activos custodiados
        ACTIVO,            // Acuerdo vigente (sinónimo de CREADO para compatibilidad de lectura)
        CUSTODIADO,        // Al menos un activo (o ambos) custodiados
        APERTURA,          // Ambas partes abrieron dentro de las ventanas de tiempo
        EN_DISPUTA,        // Solicitud de anulación en curso (C8)
        RESOLUCION_SOCIOS, // Votación de Socios (C8)
        COMPLETADO,        // Firmas duales + valoraciones: activos liberados en cruz
        ANULADO,           // Anulación con quórum o por defecto (C8)
        BLOQUEADO          // Violación de norma (C8)
    }

    /// @dev Activo ofrecido en un trueque: NFT (ERC721) o cripto (ERC20).
    struct Activo {
        address token;     // contrato ERC20 o ERC721
        uint256 tokenId;   // tokenId si es NFT; 0 si es ERC20
        uint256 cantidad;  // cantidad si es ERC20; 1 si es NFT
        bool esNft;        // true = ERC721, false = ERC20
    }

    /// @dev Trueke (intercambio AtoA).
    struct Trueke {
        uint256 id;
        address parteA;         // ofrece activoA y recibe activoB
        address parteB;         // ofrece activoB y recibe activoA
        Activo activoA;         // lo que ofrece A (se custodia)
        Activo activoB;         // lo que ofrece B (se custodia al completar)
        Estado estado;
        uint256 horaPautada;    // hora pautada del encuentro (unix)
        uint256 aperturaA;      // timestamp de apertura de A (0 si no abrió)
        uint256 aperturaB;      // timestamp de apertura de B (0 si no abrió)
        bool firmaRecepcionA;   // A certificó que recibió correctamente
        bool firmaRecepcionB;   // B certificó que recibió correctamente
        bool valoracionA;       // A marcó su valoración (requisito de COMPLETADO, D36)
        bool valoracionB;       // B marcó su valoración (requisito de COMPLETADO, D36)
        bool activoCustodiadoA; // el activo de A está en el escrow
        bool activoCustodiadoB; // el activo de B está en el escrow
        // --- Ciclo 8: anulación/disputa/bloqueo (CU-17/18/19) ---
        address solicitanteAnulacion;  // quien solicitó la anulación (0 = sin solicitud)
        string motivoAnulacion;        // justificación (RF-06.1)
        uint256 plazoAnulacion;        // timestamp límite de la votación (≤5 días — D13)
        uint256 votosAFavor;           // votos de Socios a favor de anular
        uint256 votosEnContra;         // votos de Socios en contra
        bool socioVotoRegistrado;      // marca de votación registrada (espejo on-chain)
        uint256 resolucionTimestamp;   // cuando se resolvió la disputa (timelock 6h — D21)
        uint256 sancionTimestamp;      // cuando se programó una sanción
    }

    // ------------------------------------------------------------------ estado
    uint256 private _siguienteId;
    mapping(uint256 => Trueke) private _truekes;
    mapping(bytes32 => bool) private _votoEmitido; // (truekeId, socio) → ya votó (D21)

    // ------------------------------------------------------------------ eventos (para el indexador, §5)
    event TruekeCreado(uint256 indexed id, address parteA, address parteB, address tokenA, address tokenB, uint256 horaPautada);
    event CustodiaA(uint256 indexed id);
    event CustodiaB(uint256 indexed id);
    event AperturaA(uint256 indexed id, uint256 timestamp);
    event AperturaB(uint256 indexed id, uint256 timestamp);
    event RecepcionFirmadaA(uint256 indexed id);
    event RecepcionFirmadaB(uint256 indexed id);
    event ValoracionMarcadaA(uint256 indexed id);
    event ValoracionMarcadaB(uint256 indexed id);
    event TruekeCompletado(uint256 indexed id);
    event TruekeCancelado(uint256 indexed id);
    event EscrowBloqueado(uint256 indexed id);
    event AnulacionSolicitada(uint256 indexed id, address solicitante, string motivo, uint256 plazo);
    event VotoSocio(uint256 indexed id, bool aFavor);
    event ResolucionEjecutada(uint256 indexed id, bool anulada);
    event ResolucionPorDefecto(uint256 indexed id);
    event SancionProgramada(uint256 indexed id, uint256 ejecutaEn);

    // ------------------------------------------------------------------ errores
    error NoAutorizado(uint256 id);
    error EstadoInvalido(uint256 id, Estado esperado);
    error FueraDeVentanaApertura(uint256 actual, uint256 pautada);
    error DiferenciaAperturasExcedida(uint256 aperturaA, uint256 aperturaB);
    error ActivoYaCustodiado();
    error SinCustodiaCompleta();
    error ActivoNoPermitido();
    error SinSolicitudAnulacion();
    error AnulacionYaSolicitada();
    error PlazoAnulacionVencido();
    error SoloSocio();
    error QuorumNoAlcanzado();
    error TimelockNoVencido(uint256 falta);
    error SinSancionProgramada();

    // ------------------------------------------------------------------ constructor
    constructor() Ownable(msg.sender) {}

    // ------------------------------------------------------------------ configuración (C8)
    address public sociosRegistry; // padrón de Socios (quórum ≥2/3 — D21)
    uint256 public plazoAnulacionMax = 5 days;   // D13
    uint256 public timelockSanciones = 6 hours;  // D21 (solo sanciones)

    /// @notice Vincula el SociosRegistry (solo owner).
    function vincularSociosRegistry(address registry_) external onlyOwner {
        sociosRegistry = registry_;
    }

    function _esSocio(address quien) private view returns (bool) {
        if (sociosRegistry == address(0)) return false;
        (bool ok, bytes memory data) = sociosRegistry.staticcall(
            abi.encodeWithSignature("esSocio(address)", quien)
        );
        return ok && data.length >= 32 && abi.decode(data, (bool));
    }

    function _esQuorum(uint256 aFavor, uint256 enContra) private view returns (bool) {
        // quórum ≥2/3 del padrón: se consulta totalSocios() del registry
        (bool ok, bytes memory data) = sociosRegistry.staticcall(
            abi.encodeWithSignature("totalSocios()")
        );
        uint256 total = ok && data.length >= 32 ? abi.decode(data, (uint256)) : 0;
        if (total == 0) return false;
        uint256 votados = aFavor + enContra;
        // mayoría cualificada: aFavor * 3 >= total * 2 (sobre el padrón vigente)
        return aFavor * 3 >= total * 2 && aFavor > 0;
    }

    // ------------------------------------------------------------------ vistas
    function siguienteId() external view returns (uint256) { return _siguienteId; }

    function getTrueke(uint256 id) external view returns (Trueke memory) {
        return _truekes[id];
    }

    function estado(uint256 id) external view returns (Estado) {
        return _truekes[id].estado;
    }

    // ------------------------------------------------------------------ creación
    /**
     * @notice Crea un trueque (CU-11). Lo invoca la parte A (msg.sender), que ofrece `activoA`
     *         y solicita `activoB` de la parte B.
     * @param parteB  dirección de la contraparte.
     * @param activoA activo que A ofrece (se custodiará).
     * @param activoB activo que A desea recibir de B (B lo custodiará al completar).
     * @param horaPautada hora pautada del encuentro (unix).
     */
    function crearTrueke(
        address parteB,
        Activo calldata activoA,
        Activo calldata activoB,
        uint256 horaPautada
    ) external nonReentrant returns (uint256 id) {
        address parteA = msg.sender;
        if (parteA == parteB) revert NoAutorizado(0);
        _validarActivo(activoA);
        _validarActivo(activoB);

        id = _siguienteId++;
        _truekes[id] = Trueke({
            id: id,
            parteA: parteA,
            parteB: parteB,
            activoA: activoA,
            activoB: activoB,
            estado: Estado.CREADO,
            horaPautada: horaPautada,
            aperturaA: 0,
            aperturaB: 0,
            firmaRecepcionA: false,
            firmaRecepcionB: false,
            valoracionA: false,
            valoracionB: false,
            activoCustodiadoA: false,
            activoCustodiadoB: false,
            solicitanteAnulacion: address(0),
            motivoAnulacion: "",
            plazoAnulacion: 0,
            votosAFavor: 0,
            votosEnContra: 0,
            socioVotoRegistrado: false,
            resolucionTimestamp: 0,
            sancionTimestamp: 0
        });
        emit TruekeCreado(id, parteA, parteB, activoA.token, activoB.token, horaPautada);
    }

    /**
     * @notice La parte A deposita su activo en el escrow (CU-12). Solo antes de custodiarlo.
     *         Tras custodiar A, ya NO existe cancelación unilateral (D31).
     */
    function custodiarA(uint256 id) external nonReentrant {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteA) revert NoAutorizado(id);
        if (t.activoCustodiadoA) revert ActivoYaCustodiado();
        if (t.estado != Estado.CREADO && t.estado != Estado.ACTIVO) revert EstadoInvalido(id, Estado.CREADO);

        _transferirDesde(t.activoA, t.parteA, address(this));
        t.activoCustodiadoA = true;
        t.estado = Estado.CUSTODIADO;
        emit CustodiaA(id);
    }

    /**
     * @notice La parte B completa el trueque depositando su activo en el escrow (CU-12).
     *         Con ambos activos custodiados el trueque queda listo para la apertura dual.
     */
    function custodiarB(uint256 id) external nonReentrant {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteB) revert NoAutorizado(id);
        if (t.activoCustodiadoB) revert ActivoYaCustodiado();
        if (t.activoCustodiadoA) {
            if (t.estado != Estado.CUSTODIADO) revert EstadoInvalido(id, Estado.CUSTODIADO);
        } else {
            if (t.estado != Estado.CREADO && t.estado != Estado.ACTIVO) revert EstadoInvalido(id, Estado.CREADO);
        }

        _transferirDesde(t.activoB, t.parteB, address(this));
        t.activoCustodiadoB = true;
        t.estado = Estado.CUSTODIADO;
        emit CustodiaB(id);
    }

    // ------------------------------------------------------------------ apertura dual (RF-05.7)
    /**
     * @notice A apertura el proceso: |ahora − horaPautada| ≤ 10 min.
     */
    function aperturaA(uint256 id) external nonReentrant {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteA) revert NoAutorizado(id);
        _checkApertura(t, true);
        t.aperturaA = block.timestamp;
        t.estado = Estado.APERTURA;
        emit AperturaA(id, block.timestamp);
    }

    /**
     * @notice B apertura el proceso: |ahora − horaPautada| ≤ 10 min y
     *         |aperturaB − aperturaA| ≤ 10 min.
     */
    function aperturaB(uint256 id) external nonReentrant {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteB) revert NoAutorizado(id);
        _checkApertura(t, false);
        t.aperturaB = block.timestamp;
        t.estado = Estado.APERTURA;
        emit AperturaB(id, block.timestamp);
    }

    function _checkApertura(Trueke storage t, bool esA) private view {
        if (!t.activoCustodiadoA || !t.activoCustodiadoB) revert SinCustodiaCompleta();
        // |ahora − horaPautada| ≤ 10 min
        uint256 ahora = block.timestamp;
        uint256 pautada = t.horaPautada;
        if (ahora > pautada + VENTANA_APERTURA || ahora + VENTANA_APERTURA < pautada) {
            revert FueraDeVentanaApertura(ahora, pautada);
        }
        // |aperturaB − aperturaA| ≤ 10 min (cuando la otra parte ya abrió)
        if (esA && t.aperturaB != 0) {
            if (ahora > t.aperturaB + MAX_DIFERENCIA_APERTURAS) {
                revert DiferenciaAperturasExcedida(t.aperturaB, ahora);
            }
        } else if (!esA && t.aperturaA != 0) {
            if (ahora > t.aperturaA + MAX_DIFERENCIA_APERTURAS) {
                revert DiferenciaAperturasExcedida(t.aperturaA, ahora);
            }
        }
    }

    // ------------------------------------------------------------------ cierre (CU-14/CU-15)
    /**
     * @notice La parte A marca su valoración (D36: marcador on-chain; detalle off-chain).
     */
    function marcarValoracionA(uint256 id) external {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteA) revert NoAutorizado(id);
        t.valoracionA = true;
        emit ValoracionMarcadaA(id);
    }

    /**
     * @notice La parte B marca su valoración.
     */
    function marcarValoracionB(uint256 id) external {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteB) revert NoAutorizado(id);
        t.valoracionB = true;
        emit ValoracionMarcadaB(id);
    }

    /**
     * @notice La parte A firma la recepción correcta (CU-14).
     */
    function firmarRecepcionA(uint256 id) external nonReentrant {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteA) revert NoAutorizado(id);
        t.firmaRecepcionA = true;
        emit RecepcionFirmadaA(id);
        _intentarCompletar(t);
    }

    /**
     * @notice La parte B firma la recepción correcta. Con ambas firmas + valoraciones se
     *         liberan los activos en cruz y el trueque pasa a COMPLETADO.
     */
    function firmarRecepcionB(uint256 id) external nonReentrant {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteB) revert NoAutorizado(id);
        t.firmaRecepcionB = true;
        emit RecepcionFirmadaB(id);
        _intentarCompletar(t);
    }

    function _intentarCompletar(Trueke storage t) private {
        if (t.estado != Estado.APERTURA && t.estado != Estado.CUSTODIADO) revert EstadoInvalido(t.id, Estado.APERTURA);
        if (!t.firmaRecepcionA || !t.firmaRecepcionB) return; // esperar segunda firma
        // Invariante I7/RNF-06.1: cierre requiere valoración registrada por ambas partes (D36).
        if (!t.valoracionA || !t.valoracionB) return;

        // Marcar estado y emitir ANTES de las transferencias externas (logs ordenados para el indexador).
        t.activoCustodiadoA = false;
        t.activoCustodiadoB = false;
        t.estado = Estado.COMPLETADO;
        emit TruekeCompletado(t.id);

        // Liberar en cruz: A recibe activoB, B recibe activoA (RF-05.2/05.4).
        _liberar(t.activoB, t.parteA);
        _liberar(t.activoA, t.parteB);
    }

    // ------------------------------------------------------------------ cancelación (D31, RF-05.3)
    /**
     * @notice Cancela el trueque. Únicamente válida ANTES de custodiar cualquier activo (D31):
     *         una vez custodiado un activo, no existe cancelación unilateral.
     */
    function cancelar(uint256 id) external nonReentrant {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteA && msg.sender != t.parteB) revert NoAutorizado(id);
        if (t.activoCustodiadoA || t.activoCustodiadoB) revert ActivoYaCustodiado(); // D31
        if (t.estado != Estado.CREADO && t.estado != Estado.ACTIVO) revert EstadoInvalido(id, Estado.CREADO);

        t.estado = Estado.ANULADO; // cancelación pre-custodia (sin penalización)
        emit TruekeCancelado(id);
    }

    // ------------------------------------------------------------------ CU-17 bloqueo por violación de norma (RF-05.8)
    /**
     * @notice Moderación/Owner bloquea el intercambio por violación de norma: los activos
     *         quedan congelados (BLOQUEADO). La salida exige resolución de Socios (C8).
     */
    function bloquear(uint256 id) external onlyOwner {
        Trueke storage t = _truekes[id];
        if (t.estado == Estado.COMPLETADO || t.estado == Estado.ANULADO) revert EstadoInvalido(id, t.estado);
        t.estado = Estado.BLOQUEADO;
        emit EscrowBloqueado(id);
    }

    // ------------------------------------------------------------------ CU-18 solicitud de anulación (RF-06.1, D13/D26)
    /**
     * @notice Una parte insatisfecha solicita la anulación justificada. Se fija el plazo de
     *         votación de ≤5 días (D13). Si vence sin quórum → ANULADO por defecto (D26).
     */
    function solicitarAnulacion(uint256 id, string calldata motivo) external {
        Trueke storage t = _truekes[id];
        if (msg.sender != t.parteA && msg.sender != t.parteB) revert NoAutorizado(id);
        if (t.estado != Estado.CUSTODIADO && t.estado != Estado.APERTURA) revert EstadoInvalido(id, Estado.APERTURA);
        if (t.solicitanteAnulacion != address(0)) revert AnulacionYaSolicitada();

        t.solicitanteAnulacion = msg.sender;
        t.motivoAnulacion = motivo;
        t.plazoAnulacion = block.timestamp + plazoAnulacionMax;
        t.estado = Estado.EN_DISPUTA;
        emit AnulacionSolicitada(id, msg.sender, motivo, t.plazoAnulacion);
    }

    /**
     * @notice Un Socio vota la anulación (1 voto por Socio — D21). Al alcanzar quórum ≥2/3,
     *         la anulación se aprueba y se devuelven los activos a ambas partes (RF-06.1).
     */
    function votarSocio(uint256 id, bool aFavor) external {
        Trueke storage t = _truekes[id];
        if (!_esSocio(msg.sender)) revert SoloSocio();
        if (t.estado != Estado.EN_DISPUTA && t.estado != Estado.RESOLUCION_SOCIOS) {
            revert EstadoInvalido(id, Estado.RESOLUCION_SOCIOS);
        }
        if (block.timestamp >= t.plazoAnulacion) revert PlazoAnulacionVencido();

        // voto único por Socio: se marca en un slot derivado (id, socio)
        bytes32 slot = keccak256(abi.encodePacked(id, msg.sender));
        if (_votoEmitido[slot]) revert QuorumNoAlcanzado(); // reuse: ya votó
        _votoEmitido[slot] = true;

        if (aFavor) t.votosAFavor++;
        else t.votosEnContra++;
        t.estado = Estado.RESOLUCION_SOCIOS;
        emit VotoSocio(id, aFavor);

        if (_esQuorum(t.votosAFavor, t.votosEnContra)) {
            t.resolucionTimestamp = block.timestamp;
            _anular(t, false); // anulación aprobada por quórum — devolución inmediata (D13/D21: sin timelock para devolución)
        }
    }

    /**
     * @notice Si vencen los 5 días sin quórum → ANULADO por defecto (D26): los activos
     *         vuelven a ambas billeteras (cierre en tiempo finito). Invocable por cualquiera.
     */
    function resolverPorDefecto(uint256 id) external {
        Trueke storage t = _truekes[id];
        if (t.estado != Estado.EN_DISPUTA && t.estado != Estado.RESOLUCION_SOCIOS) {
            revert EstadoInvalido(id, Estado.RESOLUCION_SOCIOS);
        }
        if (block.timestamp < t.plazoAnulacion) revert PlazoAnulacionVencido();

        // si el quórum ya se alcanzó pero no se anuló (caso sanciones), resolver aquí
        if (_esQuorum(t.votosAFavor, t.votosEnContra)) {
            _anular(t, false);
        } else {
            _anular(t, true); // por defecto (D26)
        }
    }

    // ------------------------------------------------------------------ CU-19 sanción con timelock 6h (D21)
    /**
     * @notice Los Socios programan una sanción on-chain; se ejecuta solo tras el timelock
     *         de 6 horas (D21). La devolución por anulación NO lleva timelock (RF-06.1/D26).
     */
    function programarSancion(uint256 id) external {
        Trueke storage t = _truekes[id];
        if (!_esSocio(msg.sender)) revert SoloSocio();
        if (t.estado != Estado.BLOQUEADO && t.estado != Estado.RESOLUCION_SOCIOS) {
            revert EstadoInvalido(id, t.estado);
        }
        t.sancionTimestamp = block.timestamp + timelockSanciones;
        t.estado = Estado.RESOLUCION_SOCIOS;
        emit SancionProgramada(id, t.sancionTimestamp);
    }

    /// @notice Ejecuta la sanción programada tras el timelock de 6 h (solo sanciones — D21).
    function ejecutarSancion(uint256 id) external {
        Trueke storage t = _truekes[id];
        if (t.sancionTimestamp == 0) revert SinSancionProgramada();
        if (block.timestamp < t.sancionTimestamp) {
            revert TimelockNoVencido(t.sancionTimestamp - block.timestamp);
        }
        // sanción = bloqueo definitivo sin liberación (la ejecución on-chain la realiza el contrato)
        t.estado = Estado.BLOQUEADO;
        t.sancionTimestamp = 0;
        emit EscrowBloqueado(id);
    }

    function _anular(Trueke storage t, bool porDefecto) private {
        // devolver activos custodiados a sus dueños (RF-06.1 / D26)
        if (t.activoCustodiadoA) _liberar(t.activoA, t.parteA);
        if (t.activoCustodiadoB) _liberar(t.activoB, t.parteB);
        t.activoCustodiadoA = false;
        t.activoCustodiadoB = false;
        t.estado = Estado.ANULADO;
        if (porDefecto) emit ResolucionPorDefecto(t.id);
        else emit ResolucionEjecutada(t.id, true);
    }

    // ------------------------------------------------------------------ utilidades
    function _validarActivo(Activo calldata a) private pure {
        if (a.token == address(0)) revert ActivoNoPermitido();
        if (a.esNft) {
            if (a.tokenId == 0 || a.cantidad != 1) revert ActivoNoPermitido();
        } else {
            if (a.cantidad == 0) revert ActivoNoPermitido();
        }
    }

    function _transferirDesde(Activo memory a, address desde, address hacia) private {
        if (a.esNft) {
            IERC721(a.token).transferFrom(desde, hacia, a.tokenId);
        } else {
            IERC20(a.token).safeTransferFrom(desde, hacia, a.cantidad);
        }
    }

    /// @dev Libera un activo custodiado hacia su destinatario. El escrow es el balance holder,
    ///      por lo que ERC20 usa transfer() (no transferFrom, que exigiría auto-aprobación) y
    ///      ERC721 usa transferFrom del owner (el escrow), válido sin approve.
    function _liberar(Activo memory a, address hacia) private {
        if (a.esNft) {
            IERC721(a.token).transferFrom(address(this), hacia, a.tokenId);
        } else {
            IERC20(a.token).safeTransfer(hacia, a.cantidad);
        }
    }
}
