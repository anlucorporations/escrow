// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./UserRegistry.sol";

contract Exchange is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum OrderStatus { OPEN, FILLED, CANCELLED }

    struct Order {
        uint256 id;
        address maker;
        address giveToken;
        address takeToken;
        uint256 giveAmount;
        uint256 takeAmount;
        OrderStatus status;
        uint256 createdAt;
        uint256 filledAt;
    }

    UserRegistry public immutable userRegistry;
    uint256 private nextOrderId;
    mapping(uint256 => Order) public orders;
    mapping(address => bool) public allowedTokens;
    address[] private tokenList;
    uint256[] private orderIds;

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        address giveToken,
        address takeToken,
        uint256 giveAmount,
        uint256 takeAmount,
        uint256 createdAt
    );
    event OrderFilled(
        uint256 indexed orderId,
        address indexed taker,
        uint256 filledAt
    );
    event OrderCancelled(uint256 indexed orderId);

    modifier onlyRegisteredUser() {
        require(userRegistry.isRegistered(msg.sender), "Must be registered user to trade");
        _;
    }

    modifier onlyAllowedToken(address token) {
        require(allowedTokens[token], "Token not allowed on exchange");
        _;
    }

    constructor(address _userRegistry) Ownable(msg.sender) {
        require(_userRegistry != address(0), "Invalid UserRegistry address");
        userRegistry = UserRegistry(_userRegistry);
        nextOrderId = 1;
    }

    function addToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!allowedTokens[token], "Token already added");
        allowedTokens[token] = true;
        tokenList.push(token);
        emit TokenAdded(token);
    }

    function removeToken(address token) external onlyOwner {
        require(allowedTokens[token], "Token not allowed");
        allowedTokens[token] = false;
        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        emit TokenRemoved(token);
    }

    function getAllowedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    function getAllowedTokensCount() external view returns (uint256) {
        return tokenList.length;
    }

    function createOrder(
        address giveToken,
        address takeToken,
        uint256 giveAmount,
        uint256 takeAmount
    ) external onlyRegisteredUser onlyAllowedToken(giveToken) onlyAllowedToken(takeToken) nonReentrant returns (uint256) {
        require(giveToken != takeToken, "Tokens must be different");
        require(giveAmount > 0 && takeAmount > 0, "Amounts must be greater than 0");

        IERC20(giveToken).safeTransferFrom(msg.sender, address(this), giveAmount);

        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            maker: msg.sender,
            giveToken: giveToken,
            takeToken: takeToken,
            giveAmount: giveAmount,
            takeAmount: takeAmount,
            status: OrderStatus.OPEN,
            createdAt: block.timestamp,
            filledAt: 0
        });

        orderIds.push(orderId);

        emit OrderCreated(orderId, msg.sender, giveToken, takeToken, giveAmount, takeAmount, block.timestamp);
        return orderId;
    }

    function fillOrder(uint256 orderId) external onlyRegisteredUser nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.OPEN, "Order is not open");
        require(order.maker != msg.sender, "Cannot fill your own order");

        // Checks-Effects-Interactions (CEI): State changes before external transfers
        order.status = OrderStatus.FILLED;
        order.filledAt = block.timestamp;

        IERC20(order.takeToken).safeTransferFrom(msg.sender, order.maker, order.takeAmount);
        IERC20(order.giveToken).safeTransfer(msg.sender, order.giveAmount);

        emit OrderFilled(orderId, msg.sender, block.timestamp);
    }

    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.OPEN, "Order is not open");
        require(order.maker == msg.sender, "Only order maker can cancel");

        // Checks-Effects-Interactions (CEI): State changes before external transfer
        order.status = OrderStatus.CANCELLED;
        order.filledAt = block.timestamp;

        IERC20(order.giveToken).safeTransfer(msg.sender, order.giveAmount);

        emit OrderCancelled(orderId);
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function getOrdersCount() external view returns (uint256) {
        return orderIds.length;
    }

    function getOrdersPaged(uint256 offset, uint256 limit) external view returns (Order[] memory) {
        uint256 total = orderIds.length;
        if (offset >= total) {
            return new Order[](0);
        }
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        uint256 resultSize = end - offset;
        Order[] memory page = new Order[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            page[i] = orders[orderIds[offset + i]];
        }
        return page;
    }

    function getOrdersByMaker(address maker) external view returns (Order[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].maker == maker) {
                count++;
            }
        }
        Order[] memory makerOrders = new Order[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].maker == maker) {
                makerOrders[index] = orders[orderIds[i]];
                index++;
            }
        }
        return makerOrders;
    }
}
