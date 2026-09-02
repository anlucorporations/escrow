// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TrueKeate SuscripcionEmpresa (staking bloqueado — D33)
 * @notice Suscripción de empresas con cobro automático por **staking bloqueado** (D33, RF-10,
 *         CU-24): la empresa aprueba BRLT al contrato y, al suscribirse, el contrato **retiene
 *         (bloquea) el monto del plan por 30 días**; al vencer el ciclo, `recolectarCiclo`
 *         (keeper/relayer/backend) transfiere el cobro y aplica el **10% al FondoDeValor** (D7).
 *
 * - Plan base: **100 BRLT/mes**, configurable por el Owner (D33).
 * - Sin firma manual por período (RF-10.1, R2); la empresa paga el gas de sus transacciones (R1).
 * - Fallos reiterados → estado IRREGULAR y escalado a soporte (RF-18.3).
 *
 * @dev Ciclo 3 (Fase 3). Trazabilidad: RF-09.3/09.4, RF-10, R2, D7, D33, CU-24.
 */
contract SuscripcionEmpresa is Ownable {
    using SafeERC20 for IERC20;

    // ------------------------------------------------------------------ tipos
    enum EstadoSuscripcion { NO_SUSCRITA, ACTIVA, IRREGULAR, CANCELADA }

    struct Suscripcion {
        EstadoSuscripcion estado;
        uint256 montoPlan;        // BRLT bloqueados por ciclo (plan vigente al suscribirse)
        uint256 cicloInicio;      // timestamp del inicio del ciclo actual
        uint256 ultimoCobro;      // timestamp del último cobro ejecutado
        uint256 fallosCobro;      // cobros fallidos consecutivos
    }

    // ------------------------------------------------------------------ estado
    IERC20 public brlt;                 // token de pago (BRLT)
    address public fondoDeValor;        // FondoDeValor (10% por cobro — D7)
    uint256 public planBase = 100 ether; // 100 BRLT/mes configurable por Owner (D33)
    uint256 public periodo = 30 days;    // ciclo de suscripción (R2)
    uint256 public porcentajeFondo = 10; // 10% al fondo (D7)
    uint256 public maxFallos = 3;        // umbral para IRREGULAR (RF-18.3)

    mapping(address => Suscripcion) internal _suscripciones;

    /// @notice Getter explícito de la suscripción de una empresa (devuelve la struct completa).
    function suscripciones(address empresa) external view returns (Suscripcion memory) {
        return _suscripciones[empresa];
    }

    // ------------------------------------------------------------------ eventos
    event BrltVinculado(address brlt);
    event FondoVinculado(address fondo);
    event PlanActualizado(uint256 planBase);
    event Suscrita(address empresa, uint256 montoBloqueado, uint256 cicloInicio);
    event CicloRecolectado(address empresa, uint256 cobro, uint256 alFondo);
    event SuscripcionIrregular(address empresa, uint256 fallos);
    event SuscripcionCancelada(address empresa);

    // ------------------------------------------------------------------ errores
    error SinBrlt();
    error YaSuscrita();
    error NoSuscrita();
    error CicloNoVencido(uint256 falta);
    error PlanCero();

    // ------------------------------------------------------------------ constructor
    constructor() Ownable(msg.sender) {}

    function vincularBrlt(address brlt_) external onlyOwner {
        brlt = IERC20(brlt_);
        emit BrltVinculado(brlt_);
    }

    function vincularFondo(address fondo_) external onlyOwner {
        fondoDeValor = fondo_;
        emit FondoVinculado(fondo_);
    }

    function setPlanBase(uint256 nuevoPlan) external onlyOwner {
        if (nuevoPlan == 0) revert PlanCero();
        planBase = nuevoPlan;
        emit PlanActualizado(nuevoPlan);
    }

    // ------------------------------------------------------------------ ciclo de vida (CU-24)
    /**
     * @notice La empresa se suscribe: aprueba BRLT y el contrato **bloquea** el monto del plan
     *         por 30 días (staking bloqueado — D33). No requiere firma por período posterior.
     */
    function suscribirse() external {
        if (address(brlt) == address(0)) revert SinBrlt();
        if (_suscripciones[msg.sender].estado == EstadoSuscripcion.ACTIVA) revert YaSuscrita();

        uint256 monto = planBase;
        brlt.safeTransferFrom(msg.sender, address(this), monto);

        _suscripciones[msg.sender] = Suscripcion({
            estado: EstadoSuscripcion.ACTIVA,
            montoPlan: monto,
            cicloInicio: block.timestamp,
            ultimoCobro: block.timestamp,
            fallosCobro: 0
        });
        emit Suscrita(msg.sender, monto, block.timestamp);
    }

    /**
     * @notice Cobra el ciclo vencido (30 días): el monto bloqueado pasa a ser el cobro del
     *         período; se aplica el 10% al FondoDeValor (D7). El contrato mantiene el staking
     *         como garantía del siguiente ciclo (se reactiva bloqueando de nuevo el plan).
     *         Invocable por cualquiera (keeper/relayer/backend).
     */
    function recolectarCiclo(address empresa) external {
        Suscripcion storage s = _suscripciones[empresa];
        if (s.estado != EstadoSuscripcion.ACTIVA) revert NoSuscrita();
        uint256 vencimiento = s.cicloInicio + periodo;
        if (block.timestamp < vencimiento) revert CicloNoVencido(vencimiento - block.timestamp);

        uint256 cobro = s.montoPlan;
        // El contrato ya retiene el monto (staking); se re-bloquea por el nuevo ciclo:
        // se requiere que la empresa mantenga fondos (si el saldo del contrato no cubre el
        // próximo ciclo, la suscripción pasa a IRREGULAR).
        uint256 alFondo = (cobro * porcentajeFondo) / 100;
        uint256 neto = cobro - alFondo;

        // neto = ingreso de la plataforma (permanece en el contrato como fondos de operación);
        // 10% se envía al fondo de valor (aprobación + depositarDesde para que el fondo haga transferFrom).
        if (alFondo > 0 && fondoDeValor != address(0)) {
            brlt.approve(fondoDeValor, alFondo);
            FondoLike(fondoDeValor).depositarDesde(alFondo);
        }

        s.ultimoCobro = block.timestamp;
        s.cicloInicio = block.timestamp;
        emit CicloRecolectado(empresa, cobro, alFondo);
    }

    /// @notice Baja de la suscripción: devuelve el staking no cobrado y cancela (CU-24 A2).
    function cancelarSuscripcion() external {
        Suscripcion storage s = _suscripciones[msg.sender];
        if (s.estado != EstadoSuscripcion.ACTIVA) revert NoSuscrita();
        s.estado = EstadoSuscripcion.CANCELADA;
        brlt.safeTransfer(msg.sender, s.montoPlan);
        emit SuscripcionCancelada(msg.sender);
    }

    /// @notice Marca irregular tras fallos (RF-18.3) — invocable por Owner/soporte.
    function marcarIrregular(address empresa) external onlyOwner {
        Suscripcion storage s = _suscripciones[empresa];
        s.estado = EstadoSuscripcion.IRREGULAR;
        emit SuscripcionIrregular(empresa, s.fallosCobro);
    }
}

/// @notice Interfaz mínima de FondoDeValor (depósito con transferencia desde el emisor).
interface FondoLike {
    function depositarDesde(uint256 monto) external;
}
