// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {UserRegistry} from "../src/UserRegistry.sol";

contract EscrowTest is Test {
    Escrow public escrow;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public owner;
    address public user1;
    address public user2;
    address public arbiter;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        arbiter = makeAddr("arbiter");

        escrow = new Escrow();
        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 18);

        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));
        escrow.setArbiter(arbiter);

        tokenA.mint(user1, 1000 ether);
        tokenB.mint(user2, 1000 ether);
    }

    // ------------------------------------------------------------ admin

    function testAddToken() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKC", 18);
        escrow.addToken(address(tokenC));
        assertTrue(escrow.allowedTokens(address(tokenC)));
        assertEq(escrow.getAllowedTokensCount(), 3);
    }

    function testAddTokenOnlyOwner() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKC", 18);
        vm.prank(user1);
        vm.expectRevert();
        escrow.addToken(address(tokenC));
    }

    function testAddTokenRejectsNonContract() public {
        vm.expectRevert("Token address is not a contract");
        escrow.addToken(address(0x1234));
    }

    function testAddTokenRejectsDuplicate() public {
        vm.expectRevert("Token already added");
        escrow.addToken(address(tokenA));
    }

    function testSetArbiterOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        escrow.setArbiter(user1);
    }

    // ------------------------------------------------------------ create

    function testCreateOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);

        uint256 deadline = block.timestamp + 7 days;
        uint256 operationId = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, deadline);

        assertEq(operationId, 1);

        Escrow.Operation memory op = escrow.getOperation(operationId);

        assertEq(op.id, 1);
        assertEq(op.user1, user1);
        assertEq(op.user2, address(0));
        assertEq(op.tokenA, address(tokenA));
        assertEq(op.tokenB, address(tokenB));
        assertEq(op.amountA, 100 ether);
        assertEq(op.amountB, 200 ether);
        assertEq(uint256(op.status), uint256(Escrow.Status.Active));
        assertEq(op.createdAt, block.timestamp);
        assertEq(op.deadline, deadline);
        assertEq(op.closedAt, 0);
        assertEq(escrow.getOperationsCount(), 1);
        vm.stopPrank();
    }

    function testCreateOperationWithoutDeadline() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);
        Escrow.Operation memory op = escrow.getOperation(operationId);
        assertEq(op.deadline, 0);
        vm.stopPrank();
    }

    function testCannotCreateOperationWithSameTokens() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);

        vm.expectRevert("Tokens must be different");
        escrow.createOperation(address(tokenA), address(tokenA), 100 ether, 200 ether, 0);
        vm.stopPrank();
    }

    function testCannotCreateOperationWithPastDeadline() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);

        // deadline == now (no está en el futuro) -> debe revertir
        vm.expectRevert("Deadline must be in the future");
        escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, block.timestamp);
        vm.stopPrank();
    }

    // ---------------------------------------------------------- complete

    function testCompleteOperation() public {
        uint256 operationId = _createSwap();

        uint256 user1BalanceBBefore = tokenB.balanceOf(user1);
        uint256 user2BalanceABefore = tokenA.balanceOf(user2);

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 200 ether);
        escrow.completeOperation(operationId);
        vm.stopPrank();

        Escrow.Operation memory op = escrow.getOperation(operationId);
        assertEq(uint256(op.status), uint256(Escrow.Status.Completed));
        assertEq(op.user2, user2);
        assertGt(op.closedAt, 0);

        assertEq(tokenB.balanceOf(user1), user1BalanceBBefore + 200 ether);
        assertEq(tokenA.balanceOf(user2), user2BalanceABefore + 100 ether);
    }

    function testCannotCompleteOwnOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);

        tokenB.mint(user1, 200 ether);
        tokenB.approve(address(escrow), 200 ether);

        vm.expectRevert("Cannot complete your own operation");
        escrow.completeOperation(operationId);
        vm.stopPrank();
    }

    function testCannotCompleteAfterDeadline() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId =
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, block.timestamp + 1 days);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 200 ether);
        vm.expectRevert("Operation expired");
        escrow.completeOperation(operationId);
        vm.stopPrank();
    }

    // ------------------------------------------------------------ cancel

    function testCancelOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);

        uint256 user1BalanceBefore = tokenA.balanceOf(user1);
        escrow.cancelOperation(operationId);
        vm.stopPrank();

        Escrow.Operation memory op = escrow.getOperation(operationId);
        assertEq(uint256(op.status), uint256(Escrow.Status.Cancelled));
        assertEq(tokenA.balanceOf(user1), user1BalanceBefore + 100 ether);
    }

    function testCancelOperationOnlyCreator() public {
        uint256 operationId = _createSwap();

        vm.prank(user2);
        vm.expectRevert("Only creator can cancel");
        escrow.cancelOperation(operationId);
    }

    // ------------------------------------------------------- expiration

    function testRefundAfterExpiry() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId =
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, block.timestamp + 7 days);
        vm.stopPrank();

        vm.warp(block.timestamp + 8 days);

        uint256 balanceBefore = tokenA.balanceOf(user1);
        vm.prank(user1);
        escrow.refundAfterExpiry(operationId);

        Escrow.Operation memory op = escrow.getOperation(operationId);
        assertEq(uint256(op.status), uint256(Escrow.Status.Cancelled));
        assertGt(op.closedAt, 0);
        assertEq(tokenA.balanceOf(user1), balanceBefore + 100 ether);
    }

    function testRefundBeforeDeadlineReverts() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId =
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, block.timestamp + 7 days);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert("Deadline not reached yet");
        escrow.refundAfterExpiry(operationId);
    }

    function testRefundOnlyCreator() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId =
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, block.timestamp + 1 days);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);

        vm.prank(user2);
        vm.expectRevert("Only creator can refund");
        escrow.refundAfterExpiry(operationId);
    }

    // ---------------------------------------------------------- disputes

    function testDisputeAndResolveFavorUser1() public {
        uint256 operationId = _createSwap();

        uint256 user1BalanceBefore = tokenA.balanceOf(user1);

        vm.prank(user1);
        escrow.disputeOperation(operationId);
        Escrow.Operation memory op = escrow.getOperation(operationId);
        assertEq(uint256(op.status), uint256(Escrow.Status.Disputed));

        vm.prank(arbiter);
        escrow.resolveDispute(operationId, true);

        Escrow.Operation memory opAfter = escrow.getOperation(operationId);
        assertEq(uint256(opAfter.status), uint256(Escrow.Status.Completed));
        assertGt(opAfter.closedAt, 0);
        assertEq(tokenA.balanceOf(user1), user1BalanceBefore + 100 ether);
    }

    function testDisputeAndResolveFavorUser2() public {
        uint256 operationId = _createSwap();

        uint256 user2BalanceBefore = tokenA.balanceOf(user2);

        vm.prank(user2);
        escrow.disputeOperation(operationId);

        vm.prank(arbiter);
        escrow.resolveDispute(operationId, false);

        assertEq(tokenA.balanceOf(user2), user2BalanceBefore + 100 ether);
    }

    function testResolveDisputeFavorUser2RequiresCounterpartOnChain() public {
        uint256 operationId = _createSwap();

        // user1 disputes alone without counterpart
        vm.prank(user1);
        escrow.disputeOperation(operationId);

        vm.prank(arbiter);
        vm.expectRevert("No counterpart on-chain: disputa abierta antes de que user2 completara");
        escrow.resolveDispute(operationId, false);
    }

    function testResolveDisputeOnlyArbiter() public {
        uint256 operationId = _createSwap();

        vm.prank(user1);
        escrow.disputeOperation(operationId);

        vm.prank(user2);
        vm.expectRevert("Only arbiter can call");
        escrow.resolveDispute(operationId, true);
    }

    function testCannotDisputeWithoutArbiter() public {
        escrow.setArbiter(address(0));
        uint256 operationId = _createSwap();

        vm.prank(user1);
        vm.expectRevert("No arbiter set");
        escrow.disputeOperation(operationId);
    }

    function testCannotDisputeCompletedOperation() public {
        uint256 operationId = _createSwap();

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 200 ether);
        escrow.completeOperation(operationId);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert("Operation is not active");
        escrow.disputeOperation(operationId);
    }

    function testCannotResolveNonDisputedOperation() public {
        uint256 operationId = _createSwap();

        vm.prank(arbiter);
        vm.expectRevert("Operation is not disputed");
        escrow.resolveDispute(operationId, true);
    }

    function testCannotDisputeAfterDeadline() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId =
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, block.timestamp + 1 days);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);

        vm.prank(user1);
        vm.expectRevert("Operation expired");
        escrow.disputeOperation(operationId);
    }

    // --------------------------------------------------------- pagination

    function testPagination() public {
        for (uint256 i = 0; i < 5; i++) {
            vm.startPrank(user1);
            tokenA.approve(address(escrow), 100 ether);
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);
            vm.stopPrank();
        }

        assertEq(escrow.getOperationsCount(), 5);

        Escrow.Operation[] memory page1 = escrow.getOperations(0, 2);
        assertEq(page1.length, 2);
        assertEq(page1[0].id, 1);
        assertEq(page1[1].id, 2);

        Escrow.Operation[] memory page2 = escrow.getOperations(2, 2);
        assertEq(page2.length, 2);
        assertEq(page2[0].id, 3);
        assertEq(page2[1].id, 4);

        Escrow.Operation[] memory last = escrow.getOperations(4, 10);
        assertEq(last.length, 1);
        assertEq(last[0].id, 5);

        Escrow.Operation[] memory empty = escrow.getOperations(10, 2);
        assertEq(empty.length, 0);
    }

    // ------------------------------------------------------------ trade quota tests

    function testInscritoUserQuotaMax1ActiveTrade() public {
        UserRegistry registry = new UserRegistry();
        escrow.setUserRegistry(address(registry));

        // Registrar user1 como Inscrito (level 0)
        vm.prank(user1);
        registry.register("user1_inscrito", "user1@test.com", "+584121234567", "Calle 1, Caracas", 729000, 1159000, 19, true);

        // Primer trade permitido
        uint256 op1 = _createSwap();
        assertEq(escrow.activeTradesCount(user1), 1);

        // Segundo trade consecutivo revierte
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        vm.expectRevert("Inscrito limit: max 1 active trade");
        escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);
        vm.stopPrank();

        // Al cancelar el primero, se libera la cuota
        vm.prank(user1);
        escrow.cancelOperation(op1);
        assertEq(escrow.activeTradesCount(user1), 0);

        // Ahora sí puede crear otro
        uint256 op2 = _createSwap();
        assertEq(op2, 2);
        assertEq(escrow.activeTradesCount(user1), 1);
    }

    function testVerificadoUserQuotaMax3ActiveTrades() public {
        UserRegistry registry = new UserRegistry();
        escrow.setUserRegistry(address(registry));

        // Registrar user1 y subir a Verificado (level 1)
        vm.prank(user1);
        registry.register("user1_verif", "user1@test.com", "+584121234567", "Calle 2, Caracas", 729000, 1159000, 19, true);
        registry.setUserIdentificationLevel(user1, UserRegistry.IdentificationLevel.Verificado);

        // 3 trades permitidos
        _createSwap();
        _createSwap();
        _createSwap();
        assertEq(escrow.activeTradesCount(user1), 3);

        // El 4to trade revierte
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        vm.expectRevert("Verificado limit: max 3 active trades");
        escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);
        vm.stopPrank();
    }

    function testCertificadoUserUnlimitedTrades() public {
        UserRegistry registry = new UserRegistry();
        escrow.setUserRegistry(address(registry));

        // Registrar user1 y subir a Certificado (level 2)
        vm.prank(user1);
        registry.register("user1_cert", "user1@test.com", "+584121234567", "Calle 3, Caracas", 729000, 1159000, 19, true);
        registry.setUserIdentificationLevel(user1, UserRegistry.IdentificationLevel.Certificado);

        // Puede crear 4 o más sin restricción
        _createSwap();
        _createSwap();
        _createSwap();
        _createSwap();
        assertEq(escrow.activeTradesCount(user1), 4);
    }

    // ------------------------------------------------------------ helpers

    function _createSwap() internal returns (uint256) {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);
        vm.stopPrank();
        return operationId;
    }
}
