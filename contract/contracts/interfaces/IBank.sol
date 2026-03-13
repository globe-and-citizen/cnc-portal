// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './IPausable.sol';
import './IOwnable.sol';
import './ITokenSupport.sol';

/**
 * @title IBank
 * @notice Complete interface for Bank contract
 * @dev Single source of truth for Bank contract interactions
 * @dev Derived from: contracts/Bank.sol
 * Used by: InvestorV1 (for dividend distribution)
 */
interface IBank is IPausable, IOwnable, ITokenSupport {
  // ============ Deposits ============
  /// @notice Deposit native ETH into the bank
  function deposit() external payable;

  /// @notice Deposit ERC20 tokens into the bank
  /// @param _token Address of the token
  /// @param _amount Amount to deposit
  function depositToken(address _token, uint256 _amount) external;

  // ============ Transfers ============
  /// @notice Transfer native ETH from bank
  /// @param _to Recipient address
  /// @param _amount Amount to transfer
  function transfer(address _to, uint256 _amount) external;

  /// @notice Transfer ERC20 tokens from bank
  /// @param _token Token address
  /// @param _to Recipient address
  /// @param _amount Amount to transfer
  function transferToken(address _token, address _to, uint256 _amount) external;

  // ============ Balance Queries ============
  /// @notice Get unlocked ETH balance
  /// @return Unlocked balance in wei
  function getUnlockedBalance() external view returns (uint256);

  /// @notice Get token balance
  /// @param _token Token address
  /// @return Token balance
  function getTokenBalance(address _token) external view returns (uint256);
}
