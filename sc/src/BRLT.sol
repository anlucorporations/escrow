// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BRLT (BorloTokens)
 * @notice Stablecoin de la plataforma TrueKeate (M9).
 *
 * Emisión y valor administrados por la gobernanza (en v1 el owner actúa
 * como representante del nivel Socio). Los usuarios Empresa pagan su
 * inscripción y mensualidad en BRLT.
 */
contract BRLT is ERC20, Ownable {
    constructor() ERC20("BorloTokens", "BRLT") Ownable(msg.sender) {}

    /// @notice Emite BRLT (restringido a gobernanza/owner).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Quema BRLT del llamador (deflación controlada).
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
