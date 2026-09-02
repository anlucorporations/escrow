// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TrueKeate FondoDeValor
 * @notice Fondo de valor para gastos de operación (hosting, gas, red de despliegue —
 *         RF-03.9). Se nutre de una combinación de fuentes con porcentajes configurables por
 *         el Owner (D7): comisión base 1% del valor de cada trueque completado + 10% de las
 *         suscripciones de empresas + 5% de la emisión de BRLT.
 *
 * Fuentes de aporte:
 *   - Emisión BRLT: BRLT mintea el 5% directamente a este contrato y registra la contribución
 *     (llamada `registrarEmision(monto)` desde BRLT).
 *   - Suscripciones de empresas: SuscripcionEmpresa aprueba BRLT a este contrato y llama
 *     `depositarDesde(monto)` (10% de cada cobro).
 *   - Trueques completados (1%): el Escrow (integración de ciclos posteriores) deposita BRLT.
 *
 * @dev Ciclo 3 (Fase 3). Trazabilidad: RF-03.9, D7, D15, CU-30.
 */
contract FondoDeValor is Ownable {
    using SafeERC20 for IERC20;

    // ------------------------------------------------------------------ estado
    IERC20 public brlt;                     // token BRLT
    address public brltContract;            // dirección del contrato BRLT (emisor del 5%)
    uint256 public porcentajeTrueque = 1;   // 1% (D7, configurable por Owner)
    uint256 public porcentajeSuscripcion = 10; // 10% (D7)
    uint256 public porcentajeEmision = 5;   // 5% (D7)

    // ------------------------------------------------------------------ eventos
    event BrltVinculado(address brlt);
    event ContribucionRegistrada(uint8 fuente, uint256 monto); // 1=trueque 2=suscripcion 3=emision
    event PorcentajeActualizado(string parametro, uint256 valor);
    event RetiroParaOperacion(address destino, uint256 monto);

    // ------------------------------------------------------------------ errores
    error MontoCero();
    error SoloBrlt();
    error SinBrlt();

    // ------------------------------------------------------------------ constructor
    constructor() Ownable(msg.sender) {}

    function vincularBrlt(address brlt_) external onlyOwner {
        brlt = IERC20(brlt_);
        brltContract = brlt_;
        emit BrltVinculado(brlt_);
    }

    // ------------------------------------------------------------------ configuración (D7 — Owner)
    function setPorcentajeTrueque(uint256 pct) external onlyOwner {
        porcentajeTrueque = pct;
        emit PorcentajeActualizado("trueque", pct);
    }

    function setPorcentajeSuscripcion(uint256 pct) external onlyOwner {
        porcentajeSuscripcion = pct;
        emit PorcentajeActualizado("suscripcion", pct);
    }

    function setPorcentajeEmision(uint256 pct) external onlyOwner {
        porcentajeEmision = pct;
        emit PorcentajeActualizado("emision", pct);
    }

    // ------------------------------------------------------------------ aportes
    /// @notice El contrato BRLT registra la contribución del 5% de cada emisión (ya minteada aquí).
    function registrarEmision(uint256 monto) external {
        if (msg.sender != brltContract) revert SoloBrlt();
        if (monto == 0) revert MontoCero();
        emit ContribucionRegistrada(3, monto);
    }

    /// @notice Depósito voluntario de BRLT (fuentes autorizadas previa aprobación ERC-20).
    function depositarDesde(uint256 monto) external {
        if (monto == 0) revert MontoCero();
        brlt.safeTransferFrom(msg.sender, address(this), monto);
        emit ContribucionRegistrada(2, monto);
    }

    // ------------------------------------------------------------------ salidas
    /// @notice Retiro para gastos de operación (Owner / Operador de Infraestructura — D15/RF-18.1).
    function retirarParaOperacion(address destino, uint256 monto) external onlyOwner {
        if (monto == 0) revert MontoCero();
        if (address(brlt) == address(0)) revert SinBrlt();
        brlt.safeTransfer(destino, monto);
        emit RetiroParaOperacion(destino, monto);
    }

    /// @notice Saldo de BRLT disponible en el fondo.
    function saldoBrlt() external view returns (uint256) {
        if (address(brlt) == address(0)) return 0;
        return brlt.balanceOf(address(this));
    }
}
