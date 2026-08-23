// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {MockERC20} from "../src/MockERC20.sol";

/**
 * Réplica determinista del guion de demo (RepoTecno/README_CASO_PRACTICO.md):
 * SWAP, PAGO con garantía, disputa a favor de ambas partes, expiración.
 */
contract EscrowDemoTest is Test {
    Escrow public escrow;
    MockERC20 public tka;
    MockERC20 public tkb;
    MockERC20 public usdt; // 6 decimals
    MockERC20 public delivery;

    address public admin;
    address public user1;
    address public user2;
    address public arbiter;

    function setUp() public {
        admin = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        arbiter = makeAddr("arbiter");

        escrow = new Escrow();
        tka = new MockERC20("TokenA", "TKA", 18);
        tkb = new MockERC20("TokenB", "TKB", 18);
        usdt = new MockERC20("USDT", "USDT", 6);
        delivery = new MockERC20("DELIVERY", "DELIVERY", 18);

        escrow.addToken(address(tka));
        escrow.addToken(address(tkb));
        escrow.addToken(address(usdt));
        escrow.addToken(address(delivery));
        escrow.setArbiter(arbiter);

        tka.mint(user1, 1000 ether);
        tkb.mint(user2, 1000 ether);
        usdt.mint(user1, 5000e6);
        delivery.mint(user2, 5 ether);
    }

    /// Paso 2-3 del guion: SWAP 100 TKA <-> 200 TKB completado por user2.
    function testDemoSwap() public {
        vm.startPrank(user1);
        tka.approve(address(escrow), 100 ether);
        uint256 opId = escrow.createOperation(address(tka), address(tkb), 100 ether, 200 ether, 0);
        vm.stopPrank();

        assertEq(escrow.getOperationsCount(), 1);
        (,,,,,, Escrow.Status s,,,) = escrow.operations(opId);
        assertEq(uint256(s), uint256(Escrow.Status.Active));

        vm.startPrank(user2);
        tkb.approve(address(escrow), 200 ether);
        escrow.completeOperation(opId);
        vm.stopPrank();

        (,,,,,, s,,,) = escrow.operations(opId);
        assertEq(uint256(s), uint256(Escrow.Status.Completed));
        assertEq(tka.balanceOf(user2), 100 ether);
        assertEq(tkb.balanceOf(user1), 200 ether);
    }

    /// Paso 4-5 del guion: PAGO 1.000 USDT <-> 1 DELIVERY con deadline.
    function testDemoPaymentEscrow() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.startPrank(user1);
        usdt.approve(address(escrow), 1000e6);
        uint256 opId = escrow.createOperation(address(usdt), address(delivery), 1000e6, 1 ether, deadline);
        vm.stopPrank();

        (,,,,,,, uint256 createdAt,,) = escrow.operations(opId);
        assertEq(createdAt, block.timestamp);

        vm.startPrank(user2);
        delivery.approve(address(escrow), 1 ether);
        escrow.completeOperation(opId);
        vm.stopPrank();

        assertEq(delivery.balanceOf(user1), 1 ether);
        assertEq(usdt.balanceOf(user2), 1000e6);
    }

    /// Paso 6-7 del guion: disputa resuelta a favor del creador (refund).
    function testDemoDisputeFavorUser1() public {
        uint256 opId = _createSwap();

        vm.prank(user2);
        escrow.disputeOperation(opId);
        (,,,,,, Escrow.Status s,,,) = escrow.operations(opId);
        assertEq(uint256(s), uint256(Escrow.Status.Disputed));

        uint256 balanceBefore = tka.balanceOf(user1);
        vm.prank(arbiter);
        escrow.resolveDispute(opId, true, address(0));

        (,,,,,, s,,,) = escrow.operations(opId);
        assertEq(uint256(s), uint256(Escrow.Status.Completed));
        assertEq(tka.balanceOf(user1), balanceBefore + 100 ether);
    }

    /// Disputa resuelta a favor de la contraparte (pago liberado).
    function testDemoDisputeFavorUser2() public {
        uint256 opId = _createSwap();

        vm.prank(user1);
        escrow.disputeOperation(opId);

        uint256 balanceBefore = tka.balanceOf(user2);
        vm.prank(arbiter);
        escrow.resolveDispute(opId, false, user2);

        assertEq(tka.balanceOf(user2), balanceBefore + 100 ether);
    }

    /// Paso 8 del guion: expiración sin contraparte -> refund del creador.
    function testDemoExpiryRefund() public {
        uint256 deadline = block.timestamp + 1 days;

        vm.startPrank(user1);
        tka.approve(address(escrow), 100 ether);
        uint256 opId = escrow.createOperation(address(tka), address(tkb), 100 ether, 200 ether, deadline);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);

        uint256 balanceBefore = tka.balanceOf(user1);
        vm.prank(user1);
        escrow.refundAfterExpiry(opId);

        (,,,,,, Escrow.Status s,,,) = escrow.operations(opId);
        assertEq(uint256(s), uint256(Escrow.Status.Cancelled));
        assertEq(tka.balanceOf(user1), balanceBefore + 100 ether);
    }

    /// Las funciones no operan sobre operaciones inexistentes.
    function testDemoNonexistentOperationReverts() public {
        vm.expectRevert("Operation does not exist");
        escrow.completeOperation(42);

        vm.expectRevert("Operation does not exist");
        escrow.disputeOperation(42);

        vm.prank(arbiter);
        vm.expectRevert("Operation does not exist");
        escrow.resolveDispute(42, true, address(0));
    }

    function _createSwap() internal returns (uint256) {
        vm.startPrank(user1);
        tka.approve(address(escrow), 100 ether);
        uint256 opId = escrow.createOperation(address(tka), address(tkb), 100 ether, 200 ether, 0);
        vm.stopPrank();
        return opId;
    }
}
