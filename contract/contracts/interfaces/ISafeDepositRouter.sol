// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IOwnable} from "./IOwnable.sol";
import {IPausable} from "./IPausable.sol";
import {ITokenSupport} from "./ITokenSupport.sol";

/**
 * @title ISafeDepositRouter
 * @notice Complete interface for SafeDepositRouter contract
 * @dev Single source of truth for SafeDepositRouter contract interactions
 * @dev Derived from: contracts/SafeDepositRouter.sol
 * Used by: Officer
 */
interface ISafeDepositRouter is IPausable, IOwnable, ITokenSupport {
  // ============ Configuration ============
  /// @notice Set the safe address where deposits are sent
  /// @param newSafe New safe address
  function setSafeAddress(address newSafe) external;

  /// @notice Set the SHER token multiplier
  /// @param newMultiplier New multiplier value
  function setMultiplier(uint256 newMultiplier) external;

  // ============ Deposit Controls ============
  /// @notice Enable deposits
  function enableDeposits() external;

  /// @notice Disable deposits
  function disableDeposits() external;
}
