// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FeeCalculator
 * @notice Library to calculate trading fees based on spread detection.
 * @dev Fixes Issue #2108: Fees were previously calculated via SETTLEMENT_ADJUSTMENT deltas,
 *      which are $0 for Polymarket trades because fees are baked into the fill price.
 *      This library calculates fees by comparing the theoretical value at market mid-price
 *      vs the actual settlement value.
 */
library FeeCalculator {
    /**
     * @notice Struct to hold trade details for fee calculation.
     * @param outcomeId The ID of the outcome (0 or 1).
     * @param amount The USDC amount settled (net).
     * @param fillPrice The price at which the trade was filled (scaled by 1e6).
     * @param marketMidPrice The mid-price of the market at the time of the trade (scaled by 1e6).
     * @param isBuy Boolean indicating if the user was a buyer.
     */
    struct TradeDetails {
        uint8 outcomeId;
        uint256 amount;
        uint256 fillPrice;
        uint256 marketMidPrice;
        bool isBuy;
    }

    /**
     * @notice Calculates the fee paid by a user based on the spread.
     * @dev Polymarket fees are typically 2% of the notional value, baked into the price.
     *      If a user buys at 0.51 when the mid is 0.50, the extra 0.01 is the fee + slippage.
     *      For the purpose of this fix, we detect the "Spread Fee" as the difference between
     *      the theoretical cost at mid-price and the actual cost.
     * 
     *      Formula:
     *      1. Calculate Notional Value = Amount / (FillPrice if Buy else (1 - FillPrice))
     *      2. Calculate Theoretical Cost = Notional * MidPrice
     *      3. Fee = |Actual Cost - Theoretical Cost|
     * 
     *      Note: This is an approximation. In a real indexer, we would use the exact AMM curve
     *      to determine the "Fair Price" and subtract it from the "Fill Price".
     * 
     * @param trade The trade details.
     * @return feeAmount The calculated fee in USDC (scaled by 1e6).
     */
    function calculateSpreadFee(TradeDetails memory trade) internal pure returns (uint256 feeAmount) {
        // Constants
        uint256 SCALE = 1e6;
        
        // Safety check
        if (trade.fillPrice == 0 || trade.marketMidPrice == 0) {
            return 0;
        }

        uint256 notionalValue;
        uint256 theoreticalCost;
        uint256 actualCost = trade.amount;

        if (trade.isBuy) {
            // User buys Outcome.
            // Cost = Amount / Price. 
            // Notional = Amount / FillPrice
            // Theoretical Cost = Notional * MidPrice
            // We need to handle division carefully to avoid precision loss.
            // notional = (amount * SCALE) / fillPrice
            // theoretical = (notional * midPrice) / SCALE
            
            // Combined: theoretical = (amount * midPrice) / fillPrice
            theoreticalCost = (trade.amount * trade.marketMidPrice) / trade.fillPrice;
        } else {
            // User sells Outcome (or buys the other side).
            // If selling Outcome 1, they receive USDC.
            // Price is for Outcome 1.
            // If they sell, they get: Amount = Notional * (1 - FillPrice)
            // Notional = Amount / (1 - FillPrice)
            // Theoretical USDC = Notional * (1 - MidPrice)
            
            uint256 oneMinusFill = SCALE - trade.fillPrice;
            uint256 oneMinusMid = SCALE - trade.marketMidPrice;
            
            if (oneMinusFill == 0) return 0; // Avoid division by zero

            // theoretical = (amount * oneMinusMid) / oneMinusFill
            theoreticalCost = (trade.amount * oneMinusMid) / oneMinusFill;
        }

        // Calculate absolute difference
        if (actualCost > theoreticalCost) {
            feeAmount = actualCost - theoreticalCost;
        } else {
            feeAmount = theoreticalCost - actualCost;
        }

        return feeAmount;
    }

    /**
     * @notice Helper to calculate the "Fair Price" deviation.
     * @dev Returns the difference between Fill Price and Mid Price.
     *      This is the primary indicator of the fee spread.
     */
    function getSpreadDeviation(uint256 fillPrice, uint256 midPrice) internal pure returns (uint256) {
        if (fillPrice > midPrice) {
            return fillPrice - midPrice;
        }
        return midPrice - fillPrice;
    }
}