// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TrueKeate SociosRegistry (gobernanza — D21/D32)
 * @notice Padrón vigente de Socios y votaciones de la plataforma:
 *         - Admisión de nuevos Socios por solicitud formal + votación con quórum ≥2/3 del
 *           padrón, 1 voto por Socio, sin ponderación por nivel (RF-01.9, RF-03.9, D21, CU-03).
 *         - Propuestas económicas (emisión BRLT, aumento de tope) autorizadas con quórum ≥2/3
 *           (D32) y ejecutadas sobre el contrato BRLT vinculado.
 *
 * @dev Ciclo 3 (Fase 3). Trazabilidad: RF-01.9, RF-03.9, RF-12.3, D21, D32, CU-03/31.
 */
contract SociosRegistry is Ownable {
    // ------------------------------------------------------------------ tipos
    enum TipoPropuesta { EMITIR_BRLT, SUBIR_TOPE_BRLT }

    struct Propuesta {
        uint256 id;
        TipoPropuesta tipo;
        address proponente;
        bytes32 descripcion; // hash del detalle off-chain (propósito de la emisión — D32)
        uint256 parametro;   // monto a emitir o nuevo tope
        uint256 votosAFavor;
        uint256 votosEnContra;
        uint256 totalVotado;
        uint256 creadaEn;
        bool ejecutada;
        bool cerrada;
    }

    // ------------------------------------------------------------------ estado
    address public brlt;               // contrato BRLT vinculado (set por owner)
    mapping(address => bool) public esSocio;
    address[] public socios;

    uint256 public proximaPropuestaId;
    mapping(uint256 => Propuesta) public propuestas;
    mapping(uint256 => mapping(address => bool)) public yaVoto;

    // ------------------------------------------------------------------ eventos
    event SocioAdmitido(address socio);
    event SocioRemovido(address socio);
    event PropuestaCreada(uint256 indexed id, TipoPropuesta tipo, address proponente, uint256 parametro);
    event VotoEmitido(uint256 indexed id, address socio, bool aFavor);
    event PropuestaEjecutada(uint256 indexed id);
    event BrltVinculado(address brlt);

    // ------------------------------------------------------------------ errores
    error SoloSocio();
    error SoloOwnerOPropuesta();
    error YaSocio();
    error NoSocio(address quien);
    error YaVoto();
    error QuorumNoAlcanzado();
    error PropuestaCerrada();
    error PropuestaYaEjecutada();
    error SinBrltVinculado();

    // ------------------------------------------------------------------ constructor
    constructor() Ownable(msg.sender) {}

    // ------------------------------------------------------------------ administración
    /// @notice Vincula el contrato BRLT (una vez, por el owner).
    function vincularBrlt(address brlt_) external onlyOwner {
        brlt = brlt_;
        emit BrltVinculado(brlt_);
    }

    /// @notice Admisión directa por el owner (siembra inicial del padrón / caso fundacional).
    function admitirSocioDirecto(address socio) external onlyOwner {
        if (esSocio[socio]) revert YaSocio();
        _registrarSocio(socio);
    }

    function removerSocio(address socio) external onlyOwner {
        if (!esSocio[socio]) revert NoSocio(socio);
        esSocio[socio] = false;
        // remover de la lista (swap+pop)
        for (uint256 i = 0; i < socios.length; i++) {
            if (socios[i] == socio) {
                socios[i] = socios[socios.length - 1];
                socios.pop();
                break;
            }
        }
        emit SocioRemovido(socio);
    }

    // ------------------------------------------------------------------ vistas
    function totalSocios() external view returns (uint256) { return socios.length; }

    function esQuorumAprobado(uint256 votosAFavor) public view returns (bool) {
        if (socios.length == 0) return false;
        // quórum ≥2/3: 2*votos >= 3*socios... interpretación: aFavor >= 2/3 * totalSocios
        return votosAFavor * 3 >= socios.length * 2 && votosAFavor > 0;
    }

    // ------------------------------------------------------------------ votación de admisión (CU-03)
    /**
     * @notice Votación de admisión implícita: el candidato con puntaje ≥76 (validado off-chain)
     *         solicita y los Socios votan en lote mediante `votarAdmision(candidato, aFavor)`.
     *         Cada voto cuenta 1; la admisión procede al alcanzar quórum ≥2/3 del padrón.
     */
    mapping(address => mapping(address => bool)) public votoAdmision;
    mapping(address => uint256) public votosAFavorAdmision;
    mapping(address => uint256) public votosEnContraAdmision;
    mapping(address => bool) public candidatoPendiente;

    function solicitarAdmision() external {
        address candidato = msg.sender;
        if (esSocio[candidato]) revert YaSocio();
        candidatoPendiente[candidato] = true;
    }

    function votarAdmision(address candidato, bool aFavor) external {
        _soloSocio(msg.sender);
        if (!candidatoPendiente[candidato]) revert NoSocio(candidato);
        if (votoAdmision[candidato][msg.sender]) revert YaVoto();
        votoAdmision[candidato][msg.sender] = true;
        if (aFavor) votosAFavorAdmision[candidato]++;
        else votosEnContraAdmision[candidato]++;

        // si se alcanza el quórum de aprobación sobre el padrón vigente, se admite
        if (esQuorumAprobado(votosAFavorAdmision[candidato])) {
            _registrarSocio(candidato);
            candidatoPendiente[candidato] = false;
        }
    }

    // ------------------------------------------------------------------ propuestas económicas (D32)
    function crearPropuesta(TipoPropuesta tipo, bytes32 descripcion, uint256 parametro)
        external
        onlyOwner
        returns (uint256 id)
    {
        if (brlt == address(0)) revert SinBrltVinculado();
        id = proximaPropuestaId++;
        propuestas[id] = Propuesta({
            id: id,
            tipo: tipo,
            proponente: msg.sender,
            descripcion: descripcion,
            parametro: parametro,
            votosAFavor: 0,
            votosEnContra: 0,
            totalVotado: 0,
            creadaEn: block.timestamp,
            ejecutada: false,
            cerrada: false
        });
        emit PropuestaCreada(id, tipo, msg.sender, parametro);
    }

    function votarPropuesta(uint256 id, bool aFavor) external {
        _soloSocio(msg.sender);
        Propuesta storage p = propuestas[id];
        if (p.cerrada || p.ejecutada) revert PropuestaCerrada();
        if (yaVoto[id][msg.sender]) revert YaVoto();
        yaVoto[id][msg.sender] = true;
        if (aFavor) p.votosAFavor++;
        else p.votosEnContra++;
        p.totalVotado++;
        emit VotoEmitido(id, msg.sender, aFavor);

        // si el quórum de aprobación se alcanza, se ejecuta de inmediato (D32)
        if (esQuorumAprobado(p.votosAFavor)) {
            p.ejecutada = true;
            p.cerrada = true;
            _ejecutar(p);
            emit PropuestaEjecutada(id);
        }
    }

    function _ejecutar(Propuesta storage p) private {
        if (p.tipo == TipoPropuesta.EMITIR_BRLT) {
            // emisión hacia el proponente (owner) — el 5% se mintea al fondo dentro de BRLT (D7)
            (bool ok,) = brlt.call(
                abi.encodeWithSignature("emitir(uint256,address,bytes32)", p.parametro, p.proponente, p.descripcion)
            );
            require(ok, "emitir fallo");
        } else if (p.tipo == TipoPropuesta.SUBIR_TOPE_BRLT) {
            (bool ok,) = brlt.call(
                abi.encodeWithSignature("subirTope(uint256)", p.parametro)
            );
            require(ok, "subirTope fallo");
        }
    }

    // ------------------------------------------------------------------ internos
    function _registrarSocio(address socio) private {
        esSocio[socio] = true;
        socios.push(socio);
        emit SocioAdmitido(socio);
    }

    function _soloSocio(address quien) private view {
        if (!esSocio[quien]) revert SoloSocio();
    }
}
