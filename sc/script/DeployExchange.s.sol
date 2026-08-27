// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {UserRegistry} from "../src/UserRegistry.sol";
import {Exchange} from "../src/Exchange.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DeployExchangeScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        uint256 user2PrivateKey = uint256(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d);

        address account0 = vm.addr(deployerPrivateKey); // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        address account1 = vm.addr(user2PrivateKey);    // 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

        // Deploy contracts as deployer
        vm.startBroadcast(deployerPrivateKey);

        UserRegistry userRegistry = new UserRegistry();
        Exchange exchange = new Exchange(address(userRegistry));

        MockERC20 tokenA = new MockERC20("Token A", "TKA", 18);
        MockERC20 tokenB = new MockERC20("Token B", "TKB", 18);

        exchange.addToken(address(tokenA));
        exchange.addToken(address(tokenB));

        // Register Account 0 as trader0
        userRegistry.register("trader0", "trader0@truekeate.com", "+584120000000", "Calle 0, Caracas", 729000, 1159000, 19, true);

        tokenA.mint(account0, 1000 ether);
        tokenB.mint(account0, 1000 ether);
        tokenA.mint(account1, 1000 ether);
        tokenB.mint(account1, 1000 ether);

        vm.stopBroadcast();

        // Register Account 1 as trader1
        vm.startBroadcast(user2PrivateKey);
        userRegistry.register("trader1", "trader1@truekeate.com", "+584120000001", "Calle 1, Caracas", 729100, 1159100, 19, true);
        vm.stopBroadcast();

        console.log("UserRegistry Deployed:", address(userRegistry));
        console.log("Exchange Deployed:", address(exchange));
        console.log("Token A Deployed:", address(tokenA));
        console.log("Token B Deployed:", address(tokenB));
    }
}
