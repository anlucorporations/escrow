// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {UserRegistry} from "../src/UserRegistry.sol";

contract UserRegistryTest is Test {
    UserRegistry public registry;

    address public user1;
    address public user2;

    function setUp() public {
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        registry = new UserRegistry();
    }

    function testRegister() public {
        vm.prank(user1);
        registry.register("alice");

        assertTrue(registry.isRegistered(user1));
        assertEq(registry.getRegisteredWalletsCount(), 1);

        UserRegistry.UserProfile memory profile = registry.getUserProfile(user1);
        assertEq(profile.wallet, user1);
        assertEq(profile.username, "alice");
        assertGt(profile.registeredAt, 0);
        assertTrue(profile.isRegistered);
    }

    function testCannotRegisterTwice() public {
        vm.startPrank(user1);
        registry.register("alice");
        vm.expectRevert("Already registered");
        registry.register("alice2");
        vm.stopPrank();
    }

    function testCannotRegisterWithDuplicateUsername() public {
        vm.prank(user1);
        registry.register("alice");

        vm.prank(user2);
        vm.expectRevert("Username already taken");
        registry.register("alice");
    }

    function testCannotRegisterWithShortUsername() public {
        vm.prank(user1);
        vm.expectRevert("Username must be between 3 and 20 chars");
        registry.register("ab");
    }

    function testCannotRegisterWithLongUsername() public {
        vm.prank(user1);
        vm.expectRevert("Username must be between 3 and 20 chars");
        registry.register("abcdefghijklmnopqrstuvwxyz");
    }

    function testUpdateUsername() public {
        vm.startPrank(user1);
        registry.register("alice");
        registry.updateUsername("alicia");

        UserRegistry.UserProfile memory profile = registry.getUserProfile(user1);
        assertEq(profile.username, "alicia");

        // El nombre anterior queda libre
        vm.stopPrank();
        vm.prank(user2);
        registry.register("alice");
        assertTrue(registry.isRegistered(user2));
    }

    function testUpdateUsernameOnlyForRegistered() public {
        vm.prank(user1);
        vm.expectRevert("Not registered");
        registry.updateUsername("alice");
    }

    function testPagination() public {
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(makeAddr(string(abi.encodePacked("u", vm.toString(i)))));
            registry.register(string(abi.encodePacked("user", vm.toString(i))));
        }

        assertEq(registry.getRegisteredWalletsCount(), 5);

        UserRegistry.UserProfile[] memory page = registry.getRegisteredWalletsPaged(1, 2);
        assertEq(page.length, 2);

        UserRegistry.UserProfile[] memory empty = registry.getRegisteredWalletsPaged(10, 2);
        assertEq(empty.length, 0);
    }
}
