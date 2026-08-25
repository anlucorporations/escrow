// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Subscription
 * @notice Suscripción de empresas en BRLT (M9).
 *
 * Las empresas pagan su mensualidad depositando BRLT por adelantado
 * (modelo de staking bloqueado por periodo, sin necesidad de firmar cada
 * mes). `isActive` define si la empresa está al día para operar como
 * nivel Frecuente. Los fondos van a un fondo común retirable por el owner
 * (representante del fondo de operaciones de los Socios).
 */
contract Subscription is Ownable {
    uint256 public constant PERIOD = 30 days;

    IERC20 public immutable brlt;
    uint256 public monthlyFee;

    mapping(address => uint256) public paidUntil;
    mapping(address => bool) public businessFlag;

    event Subscribed(address indexed company, uint256 months, uint256 paidUntil);
    event BusinessFlagSet(address indexed company, bool flag);
    event MonthlyFeeSet(uint256 fee);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(IERC20 _brlt, uint256 _monthlyFee) Ownable(msg.sender) {
        brlt = _brlt;
        monthlyFee = _monthlyFee;
    }

    function setMonthlyFee(uint256 fee) external onlyOwner {
        monthlyFee = fee;
        emit MonthlyFeeSet(fee);
    }

    /// @notice Marca una cuenta como empresa (nivel Frecuente).
    function setBusiness(address company, bool flag) external onlyOwner {
        businessFlag[company] = flag;
        emit BusinessFlagSet(company, flag);
    }

    /// @notice La empresa paga `months` de suscripción en BRLT (staking bloqueado).
    function subscribe(uint256 months) external {
        require(months >= 1 && months <= 12, "1-12 months");

        uint256 cost = monthlyFee * months;
        require(cost > 0, "Fee not set");
        require(brlt.balanceOf(msg.sender) >= cost, "Insufficient BRLT balance");
        require(brlt.transferFrom(msg.sender, address(this), cost), "BRLT transfer failed");

        uint256 until;
        if (paidUntil[msg.sender] > block.timestamp) {
            until = paidUntil[msg.sender] + PERIOD * months; // renueva y extiende
        } else {
            until = block.timestamp + PERIOD * months;
        }
        paidUntil[msg.sender] = until;

        emit Subscribed(msg.sender, months, until);
    }

    /// @notice ¿La empresa está al día de pago?
    function isActive(address company) external view returns (bool) {
        return paidUntil[company] > block.timestamp;
    }

    /// @notice Retira el fondo común de suscripciones (fondo de operaciones).
    function withdraw() external onlyOwner {
        uint256 balance = brlt.balanceOf(address(this));
        require(balance > 0, "No funds");
        require(brlt.transfer(msg.sender, balance), "Transfer failed");
        emit FundsWithdrawn(msg.sender, balance);
    }
}
