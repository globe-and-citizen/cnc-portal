// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/access/IAccessControl.sol';
import './IOwnable.sol';
import './IPausable.sol';

/**
 * @title IInvestorV1
 * @notice Complete interface for InvestorV1 contract
 * @dev Single source of truth for InvestorV1 contract interactions
 * @dev Derived from: contracts/Investor/InvestorV1.sol
 * Used by: Officer, SafeDepositRouter, CashRemunerationEIP712, Bank
 */
interface IInvestorV1 is IAccessControl, IOwnable, IPausable {
  // ============ Access Control Roles ============
  /// @notice Returns the MINTER_ROLE constant
  function MINTER_ROLE() external view returns (bytes32);

  /// @notice Returns the DEFAULT_ADMIN_ROLE constant
  function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

  // ============ Minting ============
  /// @notice Mint tokens to a shareholder (requires MINTER_ROLE)
  /// @param shareholder Address to receive tokens
  /// @param amount Amount of tokens to mint
  function individualMint(address shareholder, uint256 amount) external;

  // ============ ERC20 Standard ============
  /// @notice Get token balance of an account
  /// @param account Address to query
  /// @return Token balance
  function balanceOf(address account) external view returns (uint256);

  /// @notice Get total token supply
  /// @return Total supply
  function totalSupply() external view returns (uint256);

  /// @notice Get token decimals
  /// @return Number of decimals
  function decimals() external view returns (uint8);

  // ============ Shareholder Management ============
  struct Shareholder {
    address shareholder;
    uint256 amount;
  }

  /// @notice Get all shareholders and their balances
  /// @return Array of Shareholder structs
  function getShareholders() external view returns (Shareholder[] memory);

  // ============ Dividend Distribution ============
  /// @notice Distribute native ETH dividends to all shareholders
  /// @dev Callable only by Bank and must be funded in the same call
  /// @param amount Total amount to distribute in wei
  function distributeNativeDividends(uint256 amount) external payable;

  /// @notice Distribute ERC20 token dividends to all shareholders
  /// @dev Callable only by Bank after Bank pre-funds this contract
  /// @param token Address of the ERC20 token
  /// @param amount Total amount to distribute
  function distributeTokenDividends(address token, uint256 amount) external;
}
