// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './IPausable.sol';
import './IOwnable.sol';

/**
 * @title IVesting
 * @notice Complete interface for Vesting contract
 * @dev Single source of truth for Vesting contract interactions
 * @dev Derived from: contracts/Vesting.sol
 * Used by: Officer
 */
interface IVesting is IPausable, IOwnable {
  /// @notice Create a vesting schedule for a member (agreement only, no token transfer)
  /// @param member Address receiving the vesting
  /// @param start Vesting start timestamp
  /// @param duration Total vesting duration in seconds
  /// @param cliff Cliff period in seconds (counted from start)
  /// @param totalAmount Total tokens to vest
  function addVesting(
    address member,
    uint64 start,
    uint64 duration,
    uint64 cliff,
    uint256 totalAmount
  ) external;

  /// @notice Mint the releasable amount of the caller's vesting on demand
  function release() external;

  /// @notice Stop a member's vesting, minting whatever is already releasable
  /// @param member Address whose vesting is stopped
  function stopVesting(address member) external;
}
