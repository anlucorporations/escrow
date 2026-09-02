// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SmartAccount} from "./SmartAccount.sol";

/**
 * @title TrueKeate SmartAccountFactory
 * @notice Despliega Smart Accounts (wallets de identidad ERC-4337 inspiradas — D35) para cada
 *         usuario particular. El despliegue lo paga el llamante (relayer/plataforma) de modo
 *         que el usuario no incurre en gas (RF-09.1–09.2, CU-01).
 *
 * Trazabilidad: RF-02.1, D22, D35, CU-01.
 */
contract SmartAccountFactory {
    // ------------------------------------------------------------------ eventos
    event SmartAccountDesplegada(address indexed owner, address indexed cuenta);

    // ------------------------------------------------------------------ estado
    mapping(address => address) public cuentas; // owner EOA → SmartAccount

    /// @notice Despliega la Smart Account del usuario si aún no existe (one-per-owner, CREATE2).
    function desplegarCuenta(address ownerInicial, bytes32 rootInicial)
        external
        returns (address cuenta)
    {
        address existente = cuentas[ownerInicial];
        if (existente != address(0)) return existente;

        bytes32 salt = keccak256(abi.encodePacked(ownerInicial, rootInicial));
        cuenta = address(
            new SmartAccount{salt: salt}(ownerInicial, rootInicial)
        );
        cuentas[ownerInicial] = cuenta;
        emit SmartAccountDesplegada(ownerInicial, cuenta);
    }

    /// @notice Dirección precalculada (CREATE2) de la cuenta para una dirección owner.
    function predecirCuenta(address ownerInicial, bytes32 rootInicial)
        external
        view
        returns (address)
    {
        bytes32 salt = keccak256(abi.encodePacked(ownerInicial, rootInicial));
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(abi.encodePacked(type(SmartAccount).creationCode, abi.encode(ownerInicial, rootInicial)))
            )
        );
        return address(uint160(uint256(hash)));
    }
}
