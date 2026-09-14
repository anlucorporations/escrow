// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";

/**
 * @title DeployEscrow — despliega SOLO un Escrow nuevo y lo vincula a los
 *        contratos YA desplegados (NFT oficial + SociosRegistry).
 *
 * Contexto (2026-09-09): el Escrow desplegado en el anvil de GCP era anterior a
 * F1 (no tenía `vincularTrueKeateNft` ni el registry vinculado). Este script
 * despliega la versión nueva sin recrear el resto de contratos (que ya tienen
 * datos: padrón, NFTs minteados, BRLT, SBT…).
 *
 * Uso:
 *   forge script script/DeployEscrow.s.sol:DeployEscrow \
 *     --rpc-url $RPC --private-key $OWNER_PK --broadcast
 *
 * Variables opcionales: NFT_ADDRESS y REGISTRY_ADDRESS (por defecto, los de GCP).
 */
contract DeployEscrow is Script {
    function run() external {
        uint256 ownerPk = vm.envUint("PRIVATE_KEY");
        address nft = vm.envOr("NFT_ADDRESS", address(0x6C2d83262fF84cBaDb3e416D527403135D757892));
        address registry = vm.envOr("REGISTRY_ADDRESS", address(0xB0f05d25e41FbC2b52013099ED9616f1206Ae21B));

        vm.startBroadcast(ownerPk);

        // 1) Escrow nuevo (deployer = Owner)
        Escrow escrow = new Escrow();

        // 2) Vinculaciones a los contratos existentes
        escrow.vincularTrueKeateNft(nft);       // solo acepta el NFT oficial (F1)
        escrow.vincularSociosRegistry(registry); // padrón de Socios para disputas (CU-18/19)

        vm.stopBroadcast();

        console2.log("Escrow NUEVO desplegado en:", address(escrow));
        console2.log("TrueKeateNFT vinculado:", nft);
        console2.log("SociosRegistry vinculado:", registry);
        console2.log("Owner/deployer:", vm.addr(ownerPk));
        console2.log("siguienteId inicial:", escrow.siguienteId());
    }
}
