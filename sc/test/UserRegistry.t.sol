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

    function testRegisterWithAllMandatoryFields() public {
        vm.prank(user1);
        registry.register(
            "alice",
            "alice@truekeate.com",
            "+584121112233",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            19,
            true
        );

        assertTrue(registry.isRegistered(user1));
        assertEq(registry.getRegisteredWalletsCount(), 1);

        UserRegistry.UserProfile memory profile = registry.getUserProfile(user1);
        assertEq(profile.wallet, user1);
        assertEq(profile.username, "alice");
        assertEq(profile.email, "alice@truekeate.com");
        assertEq(profile.phone, "+584121112233");
        assertEq(profile.physicalAddress, "Av. Bolivar, Barlovento, Miranda");
        assertEq(profile.utmEasting, 729450);
        assertEq(profile.utmNorthing, 1159800);
        assertEq(profile.utmZone, 19);
        assertTrue(profile.isNorthernHemisphere);
        assertGt(profile.registeredAt, 0);
        assertTrue(profile.isRegistered);
    }

    function testCannotRegisterTwice() public {
        vm.startPrank(user1);
        registry.register(
            "alice",
            "alice@truekeate.com",
            "+584121112233",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            19,
            true
        );
        vm.expectRevert("Already registered");
        registry.register(
            "alice2",
            "alice2@truekeate.com",
            "+584129998877",
            "Calle 2, Caracas",
            730000,
            1160000,
            19,
            true
        );
        vm.stopPrank();
    }

    function testCannotRegisterWithDuplicateUsername() public {
        vm.prank(user1);
        registry.register(
            "alice",
            "alice@truekeate.com",
            "+584121112233",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            19,
            true
        );

        vm.prank(user2);
        vm.expectRevert("Username already taken");
        registry.register(
            "alice",
            "bob@truekeate.com",
            "+584122223344",
            "Calle 5, Higuerote",
            735000,
            1165000,
            19,
            true
        );
    }

    function testCannotRegisterWithDuplicateEmail() public {
        vm.prank(user1);
        registry.register(
            "alice",
            "alice@truekeate.com",
            "+584121112233",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            19,
            true
        );

        vm.prank(user2);
        vm.expectRevert("Email already registered");
        registry.register(
            "bob",
            "alice@truekeate.com",
            "+584122223344",
            "Calle 5, Higuerote",
            735000,
            1165000,
            19,
            true
        );
    }

    function testCannotRegisterWithDuplicatePhone() public {
        vm.prank(user1);
        registry.register(
            "alice",
            "alice@truekeate.com",
            "+584121112233",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            19,
            true
        );

        vm.prank(user2);
        vm.expectRevert("Phone already registered");
        registry.register(
            "bob",
            "bob@truekeate.com",
            "+584121112233",
            "Calle 5, Higuerote",
            735000,
            1165000,
            19,
            true
        );
    }

    function testCannotRegisterWithDuplicateLocation() public {
        vm.prank(user1);
        registry.register(
            "alice",
            "alice@truekeate.com",
            "+584121112233",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            19,
            true
        );

        vm.prank(user2);
        vm.expectRevert("Location already registered");
        registry.register(
            "bob",
            "bob@truekeate.com",
            "+584122223344",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            19,
            true
        );
    }

    function testCannotRegisterWithInvalidZone() public {
        vm.prank(user1);
        vm.expectRevert("Invalid UTM zone (1-60)");
        registry.register(
            "alice",
            "alice@truekeate.com",
            "+584121112233",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            0,
            true
        );
    }

    function testUpdateUsername() public {
        vm.startPrank(user1);
        registry.register(
            "alice",
            "alice@truekeate.com",
            "+584121112233",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            19,
            true
        );
        registry.updateUsername("alicia");

        UserRegistry.UserProfile memory profile = registry.getUserProfile(user1);
        assertEq(profile.username, "alicia");

        // El nombre anterior queda libre para otro usuario
        vm.stopPrank();
        vm.prank(user2);
        registry.register(
            "alice",
            "bob@truekeate.com",
            "+584122223344",
            "Calle 5, Higuerote",
            735000,
            1165000,
            19,
            true
        );
        assertTrue(registry.isRegistered(user2));
    }

    function testReputationRanksBroncePlataOro() public {
        vm.prank(user1);
        registry.register(
            "alice",
            "alice@truekeate.com",
            "+584121112233",
            "Av. Bolivar, Barlovento, Miranda",
            729450,
            1159800,
            19,
            true
        );

        // Inicial: 0 trades -> Bronce (rank = 1)
        (uint256 completed, uint256 lost, uint256 eff, uint8 rank) = registry.getReputation(user1);
        assertEq(completed, 0);
        assertEq(lost, 0);
        assertEq(eff, 100);
        assertEq(rank, 1); // Bronce

        // Simular 60 trades completados y 5 perdidos -> Plata (rank = 2, 60/65 = 92%)
        for (uint256 i = 0; i < 60; i++) {
            registry.recordTradeOutcome(user1, true, false);
        }
        for (uint256 i = 0; i < 5; i++) {
            registry.recordTradeOutcome(user1, false, true);
        }
        assertEq(registry.getReputationRank(user1), 2); // Plata

        // Simular 950 trades adicionales ganados (total 1010 ganados, 5 perdidos = 99.5%) -> Oro (rank = 3)
        for (uint256 i = 0; i < 950; i++) {
            registry.recordTradeOutcome(user1, true, false);
        }
        assertEq(registry.getReputationRank(user1), 3); // Oro
    }
}


