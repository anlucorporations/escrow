// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrueKeate BRLT — BorloTokens (stablecoin de la plataforma)
 * @notice Stablecoin ERC-20 **emitida desde el inicio del proyecto**, controlada por el contrato
 *         de Socios (SociosRegistry) (RF-12.1, RF-12.3, D6): `emitir`/`subirTope` solo invocables
 *         por el SociosRegistry, que ya validó el quórum ≥2/3 de Socios (D32).
 *
 * - Tope inicial de emisión: **1.000.000 BRLT**; aumentar el tope exige votación de ≥2/3 de
 *   Socios (D32).
 * - Cada emisión se registra con su propósito (D32) en el evento `EmisionRegistrada`.
 * - El **5% de cada emisión** contribuye al FondoDeValor (D7, RF-03.9): se mintea directamente
 *   al fondo y se registra la contribución.
 *
 * @dev Ciclo 3 (Fase 3). Trazabilidad: RF-12.1–12.4, RF-14.7, D5, D6, D7, D32, CU-31.
 */
contract BRLT is ERC20, Ownable {
    // ------------------------------------------------------------------ estado
    address public registry;           // SociosRegistry (autoridad de emisión — D6/D32)
    address public fondoDeValor;       // FondoDeValor (recibe el 5% de cada emisión — D7)
    uint256 public topeEmision;        // tope vigente (inicial 1.000.000 — D32)
    uint256 public porcentajeFondo = 5; // 5% al fondo (D7, configurable por Owner)

    uint256 public totalEmisiones;
    struct Emision {
        uint256 monto;
        bytes32 proposito;
        uint256 timestamp;
    }
    mapping(uint256 => Emision) public emisiones;

    // ------------------------------------------------------------------ eventos
    event RegistryVinculado(address registry);
    event FondoVinculado(address fondo);
    event EmisionRegistrada(uint256 indexed id, uint256 monto, bytes32 proposito, address destino);
    event TopeActualizado(uint256 nuevoTope);
    event PorcentajeFondoActualizado(uint256 pct);

    // ------------------------------------------------------------------ errores
    error SoloRegistry();
    error SoloOwnerOAdmin();
    error ExcedeTope(uint256 disponible, uint256 solicitado);
    error SinRegistry();

    // ------------------------------------------------------------------ constructor
    constructor() ERC20("BorloTokens", "BRLT") Ownable(msg.sender) {
        topeEmision = 1_000_000 ether; // tope inicial 1.000.000 BRLT (D32)
    }

    // ------------------------------------------------------------------ vinculación
    function vincularRegistry(address registry_) external onlyOwner {
        registry = registry_;
        emit RegistryVinculado(registry_);
    }

    function vincularFondo(address fondo_) external onlyOwner {
        fondoDeValor = fondo_;
        emit FondoVinculado(fondo_);
    }

    function setPorcentajeFondo(uint256 pct) external onlyOwner {
        porcentajeFondo = pct;
        emit PorcentajeFondoActualizado(pct);
    }

    // ------------------------------------------------------------------ emisión (D32 — solo vía registry con quórum 2/3)
    /**
     * @notice Emite `monto` BRLT hacia `destino`, registrando `proposito` (D32). Solo el
     *         SociosRegistry (que ya validó quórum ≥2/3) puede invocarla. El 5% (porcentajeFondo)
     *         se mintea directamente al FondoDeValor (D7).
     */
    function emitir(uint256 monto, address destino, bytes32 proposito) external {
        if (msg.sender != registry) revert SoloRegistry();
        if (totalSupply() + monto > topeEmision) {
            revert ExcedeTope(topeEmision - totalSupply(), monto);
        }

        // 5% al fondo de valor (D7)
        uint256 alFondo = (monto * porcentajeFondo) / 100;
        uint256 neto = monto - alFondo;

        if (alFondo > 0 && fondoDeValor != address(0)) {
            _mint(fondoDeValor, alFondo);
            FondoDeValorLike(fondoDeValor).registrarEmision(alFondo);
        }
        if (neto > 0) {
            _mint(destino, neto);
        }

        emisiones[totalEmisiones] = Emision({monto: monto, proposito: proposito, timestamp: block.timestamp});
        emit EmisionRegistrada(totalEmisiones, monto, proposito, destino);
        totalEmisiones++;
    }

    /// @notice Sube el tope de emisión (solo vía registry con quórum 2/3 — D32).
    function subirTope(uint256 nuevoTope) external {
        if (msg.sender != registry) revert SoloRegistry();
        require(nuevoTope > topeEmision, "nuevo tope debe superar el actual");
        topeEmision = nuevoTope;
        emit TopeActualizado(nuevoTope);
    }
}

/// @notice Interfaz mínima de FondoDeValor para el registro de contribuciones.
interface FondoDeValorLike {
    function registrarEmision(uint256 monto) external;
}
