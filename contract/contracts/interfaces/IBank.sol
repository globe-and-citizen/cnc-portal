// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IOwnable} from "./IOwnable.sol";
import {IPausable} from "./IPausable.sol";
import {ITokenSupport} from "./ITokenSupport.sol";

/**
 * @title IBank
 * @notice Complete interface for Bank contract
 * @dev Single source of truth for Bank contract interactions
 * @dev Derived from: contracts/Bank.sol
 * @dev Note: not directly imported by production contracts; available for
 *      external consumers (e.g. frontend, off-chain tooling, future contracts).
 * Used by: InvestorV1 (for bank-funded dividend distribution)
 */
interface IBank is IPausable, IOwnable, ITokenSupport {
  // ============ Deposits ============
  /// @notice Deposit native ETH into the bank
  function deposit() external payable;

  /// @notice Deposit ERC20 tokens into the bank
  /// @param token Address of the token
  /// @param amount Amount to deposit
  function depositToken(address token, uint256 amount) external;

  // ============ Transfers ============
  /// @notice Transfer native ETH from bank
  /// @param to Recipient address
  /// @param amount Amount to transfer
  function transfer(address to, uint256 amount) external;

  /// @notice Transfer ERC20 tokens from bank
  /// @param token Token address
  /// @param to Recipient address
  /// @param amount Amount to transfer
  function transferToken(address token, address to, uint256 amount) external;

  /// @notice Fund Investor and trigger native ETH dividends
  /// @param amount Total amount to distribute
  function distributeNativeDividends(uint256 amount) external;

  /// @notice Fund Investor and trigger ERC20 dividends
  /// @param token Token address
  /// @param amount Total amount to distribute
  function distributeTokenDividends(address token, uint256 amount) external;

  /// @notice Fund a FixedReturn repayment installment and trigger its distribution
  /// @param offerId The lending offer being repaid
  /// @param amount The installment amount to fund and distribute
  function fundFixedReturnRepayment(uint256 offerId, uint256 amount) external;

  // ============ Balance Queries ============
  /// @notice Get current ETH balance
  /// @return Current balance in wei
  function getBalance() external view returns (uint256);

  /// @notice Get token balance
  /// @param token Token address
  /// @return Current token balance
  function getTokenBalance(address token) external view returns (uint256);
}
