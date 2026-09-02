// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";
import {TrueKeateToken} from "../src/mocks/TrueKeateToken.sol";
import {TrueKeateNFT} from "../src/mocks/TrueKeateNFT.sol";

/**
 * @title Deploy — Ciclo 1 (Fase 3)
 * @notice Despliega Escrow + tokens de prueba en anvil (cuenta 0 = EO owner, RF-15.1).
 *
 * Uso:
 *   anvil                                    # nodo local chain 31337
 *   forge script script/Deploy.s.sol --rpc-url http://localhost:8545 \
 *     --private-key <cuenta0> --broadcast
 *
 * Después de desplegar, las direcciones quedan en broadcast/ (deployment-info).
 */
contract Deploy is Script {
    function run() external {
        uint256 ownerPk = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(ownerPk);
        vm.startBroadcast(ownerPk);

        // 1) Escrow (deployer = owner)
        Escrow escrow = new Escrow();

        // 2) Tokens de prueba (criptos ofrecidos en trueques)
        TrueKeateToken tka = new TrueKeateToken("TrueKeate Token A", "TKA");
        TrueKeateToken tkb = new TrueKeateToken("TrueKeate Token B", "TKB");

        // 3) NFT de prueba
        TrueKeateNFT nft = new TrueKeateNFT("TrueKeate NFT", "TKANFT");

        vm.stopBroadcast();

        console2.log("Escrow desplegado en:", address(escrow));
        console2.log("TKA:", address(tka));
        console2.log("TKB:", address(tkb));
        console2.log("NFT:", address(nft));
        console2.log("Owner:", owner);
    }
}
