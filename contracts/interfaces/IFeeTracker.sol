// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFeeTracker
 * @notice Interface for tracking fees that are baked into the spread.
 * @dev This interface replaces the reliance on SETTLEMENT_ADJUSTMENT events.
 */
interface IFeeTracker {
    /**
     * @notice Emitted when a fee is calculated and recorded based on spread detection.
     * @param user The address of the trader.
     * @param txHash The transaction hash.
     * @param feeAmount The calculated fee in USDC (scaled by 1e6).
     * @param fillPrice The price at which the trade occurred.
     * @param midPrice The market mid-price at the time.
     */
    event SpreadFeeDetected(
        address indexed user,
        bytes32 indexed txHash,
        uint256 feeAmount,
        uint256 fillPrice,
        uint256 midPrice
    );

    /**
     * @notice Records a fee based on spread calculation.
     * @param user The trader's address.
     * @param txHash The transaction hash.
     * @param fillPrice The fill price (scaled by 1e6).
     * @param midPrice The market mid-price (scaled by 1e6).
     * @param amount The USDC amount of the trade.
     * @param isBuy Whether the user was a buyer.
     * @return feeAmount The detected fee.
     */
    function recordSpreadFee(
        address user,
        bytes32 txHash,
        uint256 fillPrice,
        uint256 midPrice,
        uint256 amount,
        bool isBuy
    ) external returns (uint256 feeAmount);
}