// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './IPausable.sol';
import './IOwnable.sol';
import './ITokenSupport.sol';

/**
 * @title ISafeDepositRouter
 * @notice Complete interface for SafeDepositRouter contract
 * @dev Single source of truth for SafeDepositRouter contract interactions
 * Used by: Officer
 */
interface ISafeDepositRouter is IPausable, IOwnable, ITokenSupport {
  // ============ Configuration ============
  /// @notice Set the safe address where deposits are sent
  /// @param _newSafe New safe address
  function setSafeAddress(address _newSafe) external;

  /// @notice Set the SHER token multiplier
  /// @param _newMultiplier New multiplier value
  function setMultiplier(uint256 _newMultiplier) external;

  // ============ Deposit Controls ============
  /// @notice Enable deposits
  function enableDeposits() external;

  /// @notice Disable deposits
  function disableDeposits() external;
}
