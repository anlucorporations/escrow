// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {BRLT} from "../src/BRLT.sol";
import {Subscription} from "../src/Subscription.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// M9 — Stablecoin BRLT + suscripción de empresas.
contract SubscriptionTest is Test {
    BRLT public brlt;
    Subscription public sub;

    address public owner;
    address public company;

    uint256 internal constant FEE = 100e18; // 100 BRLT / mes

    function setUp() public {
        owner = address(this);
        company = makeAddr("company");

        brlt = new BRLT();
        sub = new Subscription(IERC20(address(brlt)), FEE);

        brlt.mint(company, 1000e18);
    }

    function testSubscribe() public {
        vm.startPrank(company);
        brlt.approve(address(sub), FEE);
        sub.subscribe(1);
        vm.stopPrank();

        assertTrue(sub.isActive(company));
        assertEq(sub.paidUntil(company), block.timestamp + 30 days);
        assertEq(brlt.balanceOf(company), 900e18);
        assertEq(brlt.balanceOf(address(sub)), 100e18);
    }

    function testRenewExtendsPeriod() public {
        vm.startPrank(company);
        brlt.approve(address(sub), FEE * 2);
        sub.subscribe(1);
        sub.subscribe(1);
        vm.stopPrank();

        assertEq(sub.paidUntil(company), block.timestamp + 60 days);
    }

    function testIsActiveFalseAfterExpiry() public {
        vm.startPrank(company);
        brlt.approve(address(sub), FEE);
        sub.subscribe(1);
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days);
        assertFalse(sub.isActive(company));
    }

    function testSubscribeInsufficientBalanceReverts() public {
        vm.startPrank(company);
        brlt.approve(address(sub), FEE * 12);
        vm.expectRevert("Insufficient BRLT balance");
        sub.subscribe(12); // necesita 1200 BRLT, tiene 1000
        vm.stopPrank();
    }

    function testCannotSubscribeZeroMonths() public {
        vm.prank(company);
        vm.expectRevert("1-12 months");
        sub.subscribe(0);
    }

    function testSetBusinessOnlyOwner() public {
        sub.setBusiness(company, true);
        assertTrue(sub.businessFlag(company));

        vm.prank(company);
        vm.expectRevert();
        sub.setBusiness(company, false);
    }

    function testWithdrawFunds() public {
        vm.startPrank(company);
        brlt.approve(address(sub), FEE);
        sub.subscribe(1);
        vm.stopPrank();

        sub.withdraw();
        assertEq(brlt.balanceOf(address(sub)), 0);
        assertEq(brlt.balanceOf(owner), 100e18);
    }

    function testBRLTMintOnlyOwner() public {
        brlt.mint(company, 10e18);

        vm.prank(company);
        vm.expectRevert();
        brlt.mint(company, 10e18);
    }
}
