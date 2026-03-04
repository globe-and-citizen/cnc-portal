// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './IPausable.sol';
import './IOwnable.sol';

/**
 * @title IBank
 * @notice Complete interface for Bank contract
 * @dev Single source of truth for Bank contract interactions
 * Used by: InvestorV1 (for dividend distribution)
 */
interface IBank is IPausable, IOwnable {
  // ============ Token Management ============
  /// @notice Add support for an ERC20 token
  /// @param _tokenAddress Address of the token to support
  function addTokenSupport(address _tokenAddress) external;

  /// @notice Remove support for an ERC20 token
  /// @param _tokenAddress Address of the token to remove
  function removeTokenSupport(address _tokenAddress) external;

  /// @notice Check if a token is supported
  /// @param _tokenAddress Address of the token
  /// @return True if supported
  function supportedTokens(address _tokenAddress) external view returns (bool);

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
