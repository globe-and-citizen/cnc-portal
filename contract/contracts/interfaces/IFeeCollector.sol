// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './ITokenSupport.sol';

/**
 * @title IFeeCollector
 * @notice Complete interface for FeeCollector contract
 * @dev Single source of truth for FeeCollector contract interactions
 * @dev Derived from: contracts/FeeCollector.sol
 * Used by: Officer, Bank, other contracts that need fee information
 */
interface IFeeCollector is ITokenSupport {
  // ============ Fee Configuration ============
  struct FeeConfig {
    string contractType;
    uint16 feeBps; // Fee in basis points (100 = 1%)
  }

  /// @notice Get fee in basis points for a contract type
  /// @param contractType Name of the contract type
  /// @return Fee in basis points
  function getFeeFor(string memory contractType) external view returns (uint16);

  /// @notice Set fee for a contract type
  /// @param contractType Name of the contract type
  /// @param feeBps Fee in basis points
  function setFee(string memory contractType, uint16 feeBps) external;

  /// @notice Get all configured fees
  /// @return Array of FeeConfig structs
  function getAllFeeConfigs() external view returns (FeeConfig[] memory);

  // ============ Withdrawals ============
  /// @notice Withdraw native ETH
  /// @param amount Amount to withdraw
  function withdraw(uint256 amount) external;

  /// @notice Withdraw ERC20 tokens
  /// @param _token Token address
  /// @param _amount Amount to withdraw
  function withdrawToken(address _token, uint256 _amount) external;

  // ============ Balance Queries ============
  /// @notice Get native ETH balance
  /// @return Balance in wei
  function getBalance() external view returns (uint256);

  /// @notice Get token balance
  /// @param _token Token address
  /// @return Token balance
  function getTokenBalance(address _token) external view returns (uint256);
}
