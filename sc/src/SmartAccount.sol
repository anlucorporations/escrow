// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrueKeate SmartAccount (patrón ERC-4337 inspirado — D35)
 * @notice Wallet de identidad de cada usuario particular (RF-02.1, D22). Sin EntryPoint
 *         estándar (D35): ejecuta llamadas arbitrarias verificando la firma EIP-712 del
 *         owner con nonce por cuenta (anti-replay — D16), de modo que un relayer propio
 *         pueda enviar la transacción asumiendo el gas (RF-02.3, RF-09.2).
 *
 * - Escalera de verificación on-chain: INSCRITO / VERIFICADO / CERTIFICADO (D28),
 *   certificada por un merkle root (RF-01.7) que NO revela la identidad real (RNF-01.3/01.4).
 * - Recuperación social (RF-02.2, CU-04): 3 guardianes, umbral 2 de 3, timelock de
 *   aviso de 48 h antes de ejecutar el cambio de owner (D34). Nunca se mueven fondos.
 *
 * @dev Ciclo 2 (Fase 3). Trazabilidad: RF-01.7, RF-02.1–02.3, D16, D22, D28, D34, D35,
 *      CU-01/02/04.
 */
contract SmartAccount is EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    // ------------------------------------------------------------------ tipos
    /// @dev Escalera de estados de verificación del usuario (D28).
    enum EstadoVerificacion { INSCRITO, VERIFICADO, CERTIFICADO }

    struct PropuestaRecuperacion {
        address nuevoOwner;
        uint256 momentoAprobada; // timestamp en que se alcanzó el umbral (0 = sin propuesta en curso)
        uint256 aprobacionesBitmask; // bits 0..2: guardianes que aprobaron
        address solicitante;
    }

    // ------------------------------------------------------------------ constantes EIP-712
    bytes32 private constant _EXECUTE_TYPEHASH =
        keccak256("Execute(address to,uint256 value,bytes data,uint256 nonce)");
    bytes32 private constant _CAMBIAR_ESTADO_TYPEHASH =
        keccak256("CambiarEstadoVerificacion(uint8 estado,uint256 nonce)");

    // ------------------------------------------------------------------ constantes (D34)
    uint256 public constant NUM_GUARDIANES = 3;
    uint256 public constant UMBRAL_GUARDIANES = 2;
    uint256 public constant TIMELOCK_RECUPERACION = 48 hours;

    // ------------------------------------------------------------------ estado
    address public owner;
    bytes32 public kycMerkleRoot; // certifica el estado de verificación (RF-01.7)
    EstadoVerificacion public estadoVerificacion;
    uint256 public nonce;

    address[NUM_GUARDIANES] private _guardianes;
    PropuestaRecuperacion private _propuesta;

    // ------------------------------------------------------------------ eventos
    event OwnerActualizado(address nuevoOwner);
    event GuardianesDesignados(address[NUM_GUARDIANES] guardianes);
    event MerkleRootActualizado(bytes32 root, EstadoVerificacion estado);
    event Ejecutado(address destino, bytes data, uint256 nonce);
    event RecuperacionSolicitada(address nuevoOwner, address guardia);
    event RecuperacionCancelada();
    event RecuperacionEjecutada(address nuevoOwner);

    // ------------------------------------------------------------------ errores
    error SoloOwner();
    error SoloGuardian();
    error NonceInvalido(uint256 esperado, uint256 recibido);
    error FirmaInvalida();
    error GuardiaYaAprobo();
    error UmbralAlcanzado();
    error SinPropuesta();
    error TimelockNoVencido(uint256 falta);
    error PropuestaYaEnCurso();
    error GuardianesFijos();

    // ------------------------------------------------------------------ constructor
    /// @param ownerInicial EOA del usuario (owner de la cuenta).
    /// @param rootInicial merkle root inicial (usuario INSCRITO) — puede ser 0 hasta el KYC.
    constructor(address ownerInicial, bytes32 rootInicial) EIP712("TrueKeate SmartAccount", "1") {
        owner = ownerInicial;
        kycMerkleRoot = rootInicial;
        estadoVerificacion = EstadoVerificacion.INSCRITO;
    }

    // ------------------------------------------------------------------ vistas
    function guardianes() external view returns (address[NUM_GUARDIANES] memory) {
        return _guardianes;
    }

    function propuestaRecuperacion() external view returns (PropuestaRecuperacion memory) {
        return _propuesta;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice Verifica que `leaf` (hash de la identidad/estado del usuario) esté incluido en
    ///         el merkle root on-chain (prueba de inclusión — RF-01.7).
    function verificarInclusion(bytes32 leaf, bytes32[] calldata prueba) external view returns (bool) {
        return MerkleProof.verify(prueba, kycMerkleRoot, leaf);
    }

    // ------------------------------------------------------------------ ejecución por firma EIP-712 (meta-tx, D16/D35)
    /**
     * @notice Ejecuta una llamada arbitraria a `destino` con `data`, autorizada por la firma
     *         EIP-712 del owner (hash tipado Execute(to,value,data,nonce)). El llamante
     *         (relayer) paga el gas; el owner solo firmó (RF-09.2, CU-01/23).
     */
    function execute(
        address destino,
        uint256 valor,
        bytes calldata data,
        uint256 nonceFirma,
        bytes calldata firma
    ) external nonReentrant returns (bytes memory resultado) {
        if (nonceFirma != nonce) revert NonceInvalido(nonce, nonceFirma);
        _validarFirmaOwner(_hashExecute(destino, valor, data, nonceFirma), firma);
        nonce++;
        emit Ejecutado(destino, data, nonce);
        (bool ok, bytes memory ret) = destino.call{value: valor}(data);
        if (!ok) {
            // propagar el revert de la llamada interna
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }
        return ret;
    }

    // ------------------------------------------------------------------ verificación (RF-01.7, D28)
    /**
     * @notice El owner (vía firma EIP-712) o el backend autorizado actualiza la escalera de
     *         verificación y su merkle root, sin revelar identidad real (RNF-01.4).
     *         El backend llama execute(...) con la firma del owner (CU-02).
     */
    function cambiarEstadoVerificacion(
        EstadoVerificacion nuevoEstado,
        bytes32 nuevoRoot,
        uint256 nonceFirma,
        bytes calldata firma
    ) external nonReentrant {
        if (nonceFirma != nonce) revert NonceInvalido(nonce, nonceFirma);
        _validarFirmaOwner(_hashCambiarEstado(uint8(nuevoEstado), nonceFirma), firma);
        nonce++;
        estadoVerificacion = nuevoEstado;
        kycMerkleRoot = nuevoRoot;
        emit MerkleRootActualizado(nuevoRoot, nuevoEstado);
    }

    // ------------------------------------------------------------------ recuperación social (D34)
    /**
     * @notice El owner designa a los 3 guardianes (RF-02.2, D34). Solo se puede fijar
     *         una vez por cuenta para evitar rotación maliciosa durante un ataque.
     */
    function designarGuardianes(address[NUM_GUARDIANES] calldata nuevosGuardianes) external {
        if (msg.sender != owner) revert SoloOwner();
        if (_guardianes[0] != address(0)) revert GuardianesFijos();
        for (uint256 i = 0; i < NUM_GUARDIANES; i++) {
            if (nuevosGuardianes[i] == address(0) || nuevosGuardianes[i] == owner) revert SoloGuardian();
            for (uint256 j = i + 1; j < NUM_GUARDIANES; j++) {
                if (nuevosGuardianes[i] == nuevosGuardianes[j]) revert SoloGuardian();
            }
        }
        _guardianes = nuevosGuardianes;
        emit GuardianesDesignados(nuevosGuardianes);
    }

    /**
     * @notice Un guardián propone (o aprueba) la recuperación hacia `nuevoOwner`.
     *         Al alcanzar el umbral 2 de 3 se fija el timestamp del timelock de 48 h (D34).
     *         La recuperación NUNCA mueve fondos (solo cambia el owner).
     */
    function proponerRecuperacion(address nuevoOwner) external {
        _soloGuardian(msg.sender);
        if (nuevoOwner == address(0)) revert SoloOwner();
        if (_propuesta.momentoAprobada != 0) revert PropuestaYaEnCurso();

        uint256 idx = _indiceGuardian(msg.sender);
        uint256 bit = 1 << idx;
        if (_propuesta.aprobacionesBitmask & bit != 0) revert GuardiaYaAprobo();

        _propuesta.aprobacionesBitmask |= bit;
        _propuesta.nuevoOwner = nuevoOwner;
        _propuesta.solicitante = msg.sender;
        emit RecuperacionSolicitada(nuevoOwner, msg.sender);

        if (_contarBits(_propuesta.aprobacionesBitmask) >= UMBRAL_GUARDIANES) {
            _propuesta.momentoAprobada = block.timestamp;
        }
    }

    /**
     * @notice El owner legítimo cancela la recuperación antes de que venza el timelock (D34).
     */
    function cancelarRecuperacion() external {
        if (msg.sender != owner) revert SoloOwner();
        if (_propuesta.momentoAprobada == 0) revert SinPropuesta();
        delete _propuesta;
        emit RecuperacionCancelada();
    }

    /**
     * @notice Transcurridas las 48 h desde que se alcanzó el umbral, se ejecuta el cambio
     *         de owner (sin mover fondos). Cualquiera puede invocarla (keeper).
     */
    function ejecutarRecuperacion() external {
        if (_propuesta.momentoAprobada == 0) revert SinPropuesta();
        uint256 vencimiento = _propuesta.momentoAprobada + TIMELOCK_RECUPERACION;
        if (block.timestamp < vencimiento) revert TimelockNoVencido(vencimiento - block.timestamp);

        address nuevoOwner = _propuesta.nuevoOwner;
        delete _propuesta;
        owner = nuevoOwner;
        emit OwnerActualizado(nuevoOwner);
        emit RecuperacionEjecutada(nuevoOwner);
    }

    // ------------------------------------------------------------------ utilidades internas
    function _hashExecute(address destino, uint256 valor, bytes calldata data, uint256 nonceFirma)
        internal
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(abi.encode(_EXECUTE_TYPEHASH, destino, valor, keccak256(data), nonceFirma))
        );
    }

    function _hashCambiarEstado(uint8 estado, uint256 nonceFirma) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(_CAMBIAR_ESTADO_TYPEHASH, estado, nonceFirma)));
    }

    function _validarFirmaOwner(bytes32 digest, bytes calldata firma) private view {
        address signer = digest.recover(firma);
        if (signer != owner) revert FirmaInvalida();
    }

    function _soloGuardian(address quien) private view {
        if (_indiceGuardian(quien) == type(uint256).max) revert SoloGuardian();
    }

    function _indiceGuardian(address quien) private view returns (uint256) {
        for (uint256 i = 0; i < NUM_GUARDIANES; i++) {
            if (_guardianes[i] == quien) return i;
        }
        return type(uint256).max;
    }

    function _contarBits(uint256 x) private pure returns (uint256) {
        uint256 cuenta;
        while (x != 0) {
            x &= x - 1;
            cuenta++;
        }
        return cuenta;
    }

    /// @dev Acepta ETH (sin uso previsto en C2; se documenta para no bloquear transferencias).
    receive() external payable {}
}
