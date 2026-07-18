// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Escrow is Ownable, ReentrancyGuard {
    struct Operation {
        uint256 id;
        address user1;
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        bool isActive;
        uint256 closedAt;
    }

    uint256 private nextOperationId;
    mapping(uint256 => Operation) public operations;
    mapping(address => bool) public allowedTokens;
    address[] private tokenList;
    uint256[] private operationIds;

    event TokenAdded(address indexed token);
    event OperationCreated(
        uint256 indexed operationId,
        address indexed user1,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    );
    event OperationCompleted(
        uint256 indexed operationId,
        address indexed user2,
        uint256 completedAt
    );
    event OperationCancelled(uint256 indexed operationId);

    constructor() Ownable(msg.sender) {
        nextOperationId = 1;
    }

    modifier onlyAllowedToken(address token) {
        require(allowedTokens[token], "Token not allowed");
        _;
    }

    function addToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!allowedTokens[token], "Token already added");
        allowedTokens[token] = true;
        tokenList.push(token);
        emit TokenAdded(token);
    }

    function getAllowedTokens() external view returns (address[] memory) {
        return tokenList;
    }
    
    function getAllowedTokensCount() external view returns (uint256) {
        return tokenList.length;
    }

    function createOperation(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external onlyAllowedToken(tokenA) onlyAllowedToken(tokenB) nonReentrant returns (uint256) {
        require(tokenA != tokenB, "Tokens must be different");
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);

        uint256 operationId = nextOperationId++;
        operations[operationId] = Operation({
            id: operationId,
            user1: msg.sender,
            tokenA: tokenA,
            tokenB: tokenB,
            amountA: amountA,
            amountB: amountB,
            isActive: true,
            closedAt: 0
        });

        operationIds.push(operationId);

        emit OperationCreated(operationId, msg.sender, tokenA, tokenB, amountA, amountB);
        return operationId;
    }

    function completeOperation(uint256 operationId) external nonReentrant {
        Operation storage operation = operations[operationId];
        require(operation.isActive, "Operation is not active");
        require(operation.user1 != msg.sender, "Cannot complete your own operation");

        IERC20(operation.tokenB).transferFrom(msg.sender, operation.user1, operation.amountB);
        IERC20(operation.tokenA).transfer(msg.sender, operation.amountA);

        operation.isActive = false;
        operation.closedAt = block.timestamp;

        emit OperationCompleted(operationId, msg.sender, block.timestamp);
    }

    function cancelOperation(uint256 operationId) external nonReentrant {
        Operation storage operation = operations[operationId];
        require(operation.isActive, "Operation is not active");
        require(operation.user1 == msg.sender, "Only creator can cancel");

        IERC20(operation.tokenA).transfer(msg.sender, operation.amountA);

        operation.isActive = false;
        operation.closedAt = block.timestamp;

        emit OperationCancelled(operationId);
    }

    function getOperation(uint256 operationId) external view returns (Operation memory) {
        return operations[operationId];
    }

    function getNextOperationId() external view returns (uint256) {
        return nextOperationId;
    }

    function getAllOperations() external view returns (Operation[] memory) {
        Operation[] memory allOps = new Operation[](operationIds.length);
        for (uint256 i = 0; i < operationIds.length; i++) {
            allOps[i] = operations[operationIds[i]];
        }
        return allOps;
    }
}
