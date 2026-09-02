// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice ERC20 de prueba para los tests del escrow (representa criptos ofrecidos en trueque).
 */
contract TrueKeateToken is ERC20 {
    constructor(string memory nombre, string memory simbolo) ERC20(nombre, simbolo) {}

    function mint(address cuenta, uint256 cantidad) external {
        _mint(cuenta, cantidad);
    }
}
