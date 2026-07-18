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

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        escrow = new Escrow();
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");

        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        tokenA.mint(user1, 1000 ether);
        tokenB.mint(user2, 1000 ether);
    }

    function testAddToken() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKC");
        escrow.addToken(address(tokenC));
        assertTrue(escrow.allowedTokens(address(tokenC)));
    }

    function testAddTokenOnlyOwner() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKC");
        vm.prank(user1);
        vm.expectRevert();
        escrow.addToken(address(tokenC));
    }

    function testCreateOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);

        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether
        );

        assertEq(operationId, 1);

        (
            uint256 id,
            address creator,
            address tA,
            address tB,
            uint256 amtA,
            uint256 amtB,
            bool isActive,
            uint256 closedAt
        ) = escrow.operations(operationId);

        assertEq(id, 1);
        assertEq(creator, user1);
        assertEq(tA, address(tokenA));
        assertEq(tB, address(tokenB));
        assertEq(amtA, 100 ether);
        assertEq(amtB, 200 ether);
        assertTrue(isActive);
        assertEq(closedAt, 0);
        vm.stopPrank();
    }

    function testCompleteOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether
        );
        vm.stopPrank();

        uint256 user1BalanceBBefore = tokenB.balanceOf(user1);
        uint256 user2BalanceABefore = tokenA.balanceOf(user2);

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 200 ether);
        escrow.completeOperation(operationId);
        vm.stopPrank();

        (, , , , , , bool isActive, uint256 closedAt) = escrow.operations(operationId);
        assertFalse(isActive);
        assertGt(closedAt, 0);

        assertEq(tokenB.balanceOf(user1), user1BalanceBBefore + 200 ether);
        assertEq(tokenA.balanceOf(user2), user2BalanceABefore + 100 ether);
    }

    function testCancelOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether
        );

        uint256 user1BalanceBefore = tokenA.balanceOf(user1);
        escrow.cancelOperation(operationId);
        vm.stopPrank();

        (, , , , , , bool isActive, ) = escrow.operations(operationId);
        assertFalse(isActive);
        assertEq(tokenA.balanceOf(user1), user1BalanceBefore + 100 ether);
    }

    function testCancelOperationOnlyCreator() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether
        );
        vm.stopPrank();

        vm.prank(user2);
        vm.expectRevert("Only creator can cancel");
        escrow.cancelOperation(operationId);
    }

    function testCannotCompleteOwnOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether
        );

        tokenB.mint(user1, 200 ether);
        tokenB.approve(address(escrow), 200 ether);

        vm.expectRevert("Cannot complete your own operation");
        escrow.completeOperation(operationId);
        vm.stopPrank();
    }

    function testCannotCreateOperationWithSameTokens() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);

        vm.expectRevert("Tokens must be different");
        escrow.createOperation(
            address(tokenA),
            address(tokenA),
            100 ether,
            200 ether
        );
        vm.stopPrank();
    }
}
