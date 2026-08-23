// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {MockERC20} from "../src/MockERC20.sol";

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

        (
            uint256 id,
            address creator,
            address tA,
            address tB,
            uint256 amtA,
            uint256 amtB,
            Escrow.Status status,
            uint256 createdAt,
            uint256 dl,
            uint256 closedAt
        ) = escrow.operations(operationId);

        assertEq(id, 1);
        assertEq(creator, user1);
        assertEq(tA, address(tokenA));
        assertEq(tB, address(tokenB));
        assertEq(amtA, 100 ether);
        assertEq(amtB, 200 ether);
        assertEq(uint256(status), uint256(Escrow.Status.Active));
        assertEq(createdAt, block.timestamp);
        assertEq(dl, deadline);
        assertEq(closedAt, 0);
        assertEq(escrow.getOperationsCount(), 1);
        vm.stopPrank();
    }

    function testCreateOperationWithoutDeadline() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);
        (,,,,,,,, uint256 dl,) = escrow.operations(operationId);
        assertEq(dl, 0);
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

        (,,,,,, Escrow.Status status,,, uint256 closedAt) = escrow.operations(operationId);
        assertEq(uint256(status), uint256(Escrow.Status.Completed));
        assertGt(closedAt, 0);

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

        (,,,,,, Escrow.Status status,,,) = escrow.operations(operationId);
        assertEq(uint256(status), uint256(Escrow.Status.Cancelled));
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

        (,,,,,, Escrow.Status status,,, uint256 closedAt) = escrow.operations(operationId);
        assertEq(uint256(status), uint256(Escrow.Status.Cancelled));
        assertGt(closedAt, 0);
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
        (,,,,,, Escrow.Status status,,,) = escrow.operations(operationId);
        assertEq(uint256(status), uint256(Escrow.Status.Disputed));

        vm.prank(arbiter);
        escrow.resolveDispute(operationId, true, address(0));

        (,,,,,, Escrow.Status statusAfter,,, uint256 closedAt) = escrow.operations(operationId);
        assertEq(uint256(statusAfter), uint256(Escrow.Status.Completed));
        assertGt(closedAt, 0);
        assertEq(tokenA.balanceOf(user1), user1BalanceBefore + 100 ether);
    }

    function testDisputeAndResolveFavorUser2() public {
        uint256 operationId = _createSwap();

        uint256 user2BalanceBefore = tokenA.balanceOf(user2);

        vm.prank(user2);
        escrow.disputeOperation(operationId);

        vm.prank(arbiter);
        escrow.resolveDispute(operationId, false, user2);

        assertEq(tokenA.balanceOf(user2), user2BalanceBefore + 100 ether);
    }

    function testResolveDisputeFavorUser2RejectsUser1AsRecipient() public {
        uint256 operationId = _createSwap();

        vm.prank(user2);
        escrow.disputeOperation(operationId);

        vm.prank(arbiter);
        vm.expectRevert("Recipient must not be user1");
        escrow.resolveDispute(operationId, false, user1);
    }

    function testResolveDisputeOnlyArbiter() public {
        uint256 operationId = _createSwap();

        vm.prank(user1);
        escrow.disputeOperation(operationId);

        vm.prank(user2);
        vm.expectRevert("Only arbiter can call");
        escrow.resolveDispute(operationId, true, address(0));
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
        escrow.resolveDispute(operationId, true, address(0));
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

    // ------------------------------------------------------------ helpers

    function _createSwap() internal returns (uint256) {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);
        vm.stopPrank();
        return operationId;
    }
}
