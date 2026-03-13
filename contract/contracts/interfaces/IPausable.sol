// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPausable
 * @notice Standard interface for pausable contracts
 * @dev Contracts implementing this interface can be paused and unpaused
 * @dev Derived from: OpenZeppelin Pausable/PausableUpgradeable pattern.
 * @dev Used via interface inheritance (e.g. IBank, ICashRemuneration, IInvestorV1);
 *      not directly imported by contracts.
 */
interface IPausable {
  /// @notice Pause contract operations
  function pause() external;

  /// @notice Unpause contract operations
  function unpause() external;

  /// @notice Check if contract is paused
  /// @return True if paused, false otherwise
  function paused() external view returns (bool);
}
