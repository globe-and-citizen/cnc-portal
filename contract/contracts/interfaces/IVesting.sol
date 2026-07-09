// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IOwnable.sol";
import "./IPausable.sol";

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

  /// @notice Mint the releasable amount of one of the caller's schedules on demand
  /// @param index The schedule's index in the caller's vestings array
  function release(uint256 index) external;

  /// @notice Stop one of a member's schedules, minting whatever is already releasable
  /// @param member Address whose schedule is stopped
  /// @param index The schedule's index in the member's vestings array
  function stopVesting(address member, uint256 index) external;
}
