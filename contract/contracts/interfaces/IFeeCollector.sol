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

  // ============ Fee Payment ============
  /// @notice Pay a native fee into the collector and emit a FeePaid event
  /// @param contractType Name of the contract type charging the fee (e.g. "BANK")
  function payFee(string calldata contractType) external payable;

  /// @notice Pay an ERC20 fee into the collector (pulled from caller) and emit a FeePaid event
  /// @param contractType Name of the contract type charging the fee (e.g. "BANK")
  /// @param token Token address
  /// @param amount Amount to pull from the caller via transferFrom
  function payFeeToken(string calldata contractType, address token, uint256 amount) external;

  // ============ Fee Beneficiary ============
  /// @notice Address that receives funds on withdraw / withdrawToken
  /// @return Current beneficiary; address(0) means withdrawals fall back to owner()
  function feeBeneficiary() external view returns (address);

  /// @notice Set the address that will receive swept fees
  /// @param _beneficiary New beneficiary address, or address(0) to clear (fall back to owner)
  function setFeeBeneficiary(address _beneficiary) external;

  // ============ Withdrawals ============
  /// @notice Withdraw native ETH to the fee beneficiary (or owner if unset)
  /// @param amount Amount to withdraw
  function withdraw(uint256 amount) external;

  /// @notice Withdraw ERC20 tokens to the fee beneficiary (or owner if unset)
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
