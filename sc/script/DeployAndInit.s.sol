// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DeployAndInitScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );

        vm.startBroadcast(deployerPrivateKey);

        Escrow escrow = new Escrow();
        MockERC20 tokenA = new MockERC20("Token A", "TKA", 18);
        MockERC20 tokenB = new MockERC20("Token B", "TKB", 18);

        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        address account0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        address account1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        address account2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

        tokenA.mint(account0, 1000 ether);
        tokenB.mint(account0, 1000 ether);
        tokenA.mint(account1, 1000 ether);
        tokenB.mint(account1, 1000 ether);
        tokenA.mint(account2, 1000 ether);
        tokenB.mint(account2, 1000 ether);

        vm.stopBroadcast();

        console.log("Escrow Deployed:", address(escrow));
        console.log("Token A Deployed:", address(tokenA));
        console.log("Token B Deployed:", address(tokenB));
    }
}
