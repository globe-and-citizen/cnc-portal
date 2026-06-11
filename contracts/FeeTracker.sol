// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IFeeTracker.sol";
import "./libraries/FeeCalculator.sol";

/**
 * @title FeeTracker
 * @notice Contract to track fees that are baked into the spread, fixing Issue #2108.
 * @dev Previously, fees were only detected via SETTLEMENT_ADJUSTMENT events.
 *      This contract explicitly calculates fees by comparing fill price vs mid price.
 */
contract FeeTracker is IFeeTracker {
    using FeeCalculator for FeeCalculator.TradeDetails;

    // Mapping to store total fees per user
    mapping(address => uint256) public userTotalFees;

    // Mapping to store fee details per transaction to prevent double counting
    mapping(bytes32 => bool) public processedTxHash;

    /**
     * @notice Records a fee based on spread calculation.
     * @dev This function should be called by the indexer or a wrapper contract
     *      when a trade event is detected.
     */
    function recordSpreadFee(
        address user,
        bytes32 txHash,
        uint256 fillPrice,
        uint256 midPrice,
        uint256 amount,
        bool isBuy
    ) external override returns (uint256 feeAmount) {
        require(!processedTxHash[txHash], "FeeTracker: Duplicate transaction");
        require(amount > 0, "FeeTracker: Invalid amount");

        processedTxHash[txHash] = true;

        FeeCalculator.TradeDetails memory trade = FeeCalculator.TradeDetails({
            outcomeId: 0, // Simplified for generic calculation
            amount: amount,
            fillPrice: fillPrice,
            marketMidPrice: midPrice,
            isBuy: isBuy
        });

        feeAmount = trade.calculateSpreadFee();

        if (feeAmount > 0) {
            userTotalFees[user] += feeAmount;
            emit SpreadFeeDetected(user, txHash, feeAmount, fillPrice, midPrice);
        }

        return feeAmount;
    }

    /**
     * @notice Gets the total fees for a user.
     * @param user The user address.
     * @return The total fees in USDC (scaled by 1e6).
     */
    function getUserTotalFees(address user) external view returns (uint256) {
        return userTotalFees[user];
    }
}