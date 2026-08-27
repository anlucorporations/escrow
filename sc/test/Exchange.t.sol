// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {UserRegistry} from "../src/UserRegistry.sol";
import {Exchange} from "../src/Exchange.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract ExchangeTest is Test {
    UserRegistry public userRegistry;
    Exchange public exchange;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        userRegistry = new UserRegistry();
        exchange = new Exchange(address(userRegistry));

        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 18);

        exchange.addToken(address(tokenA));
        exchange.addToken(address(tokenB));

        tokenA.mint(user1, 1000 ether);
        tokenB.mint(user2, 1000 ether);

        // Register user1 and user2
        vm.prank(user1);
        userRegistry.register("trader1");

        vm.prank(user2);
        userRegistry.register("trader2");
    }

    function testUserRegistration() public {
        assertTrue(userRegistry.isRegistered(user1));
        assertTrue(userRegistry.isRegistered(user2));

        UserRegistry.UserProfile memory p1 = userRegistry.getUserProfile(user1);
        assertEq(p1.username, "trader1");
        assertEq(p1.wallet, user1);
    }

    function testCannotRegisterDuplicateUsername() public {
        address user3 = makeAddr("user3");
        vm.prank(user3);
        vm.expectRevert("Username already taken");
        userRegistry.register("trader1");
    }

    function testUnregisteredUserCannotTrade() public {
        address unregistered = makeAddr("unregistered");
        tokenA.mint(unregistered, 100 ether);

        vm.startPrank(unregistered);
        tokenA.approve(address(exchange), 100 ether);

        vm.expectRevert("Must be registered user to trade");
        exchange.createOrder(address(tokenA), address(tokenB), 100 ether, 200 ether);
        vm.stopPrank();
    }

    function testCreateAndFillOrder() public {
        vm.startPrank(user1);
        tokenA.approve(address(exchange), 100 ether);
        uint256 orderId = exchange.createOrder(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether
        );
        vm.stopPrank();

        assertEq(orderId, 1);

        Exchange.Order memory order = exchange.getOrder(orderId);
        assertEq(order.maker, user1);
        assertTrue(order.status == Exchange.OrderStatus.OPEN);

        // Fill order as user2
        vm.startPrank(user2);
        tokenB.approve(address(exchange), 200 ether);
        exchange.fillOrder(orderId);
        vm.stopPrank();

        Exchange.Order memory filledOrder = exchange.getOrder(orderId);
        assertTrue(filledOrder.status == Exchange.OrderStatus.FILLED);
        assertEq(tokenB.balanceOf(user1), 200 ether);
        assertEq(tokenA.balanceOf(user2), 100 ether);
    }

    function testCancelOrder() public {
        vm.startPrank(user1);
        tokenA.approve(address(exchange), 100 ether);
        uint256 orderId = exchange.createOrder(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether
        );

        uint256 balanceBefore = tokenA.balanceOf(user1);
        exchange.cancelOrder(orderId);
        vm.stopPrank();

        Exchange.Order memory cancelledOrder = exchange.getOrder(orderId);
        assertTrue(cancelledOrder.status == Exchange.OrderStatus.CANCELLED);
        assertEq(tokenA.balanceOf(user1), balanceBefore + 100 ether);
    }
}
