// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBoardOfDirectors
 * @dev Derived from: contracts/BoardOfDirectors.sol
 */
interface IBoardOfDirectors {
  /// @notice Initializes the contract with the initial set of owners
  /// @param owners Initial set of owner addresses
  function initialize(address[] memory owners) external;

  /// @notice Replaces the board of directors with the given addresses.
  /// @param boardOfDirectors The new board member addresses.
  function setBoardOfDirectors(address[] memory boardOfDirectors) external;

  /// @notice Returns the current board of directors.
  /// @return Array of board member addresses.
  function getBoardOfDirectors() external view returns (address[] memory);

  /// @notice Returns whether an address is a board member.
  /// @param account Address to check.
  /// @return True if `account` is a board member.
  function isMember(address account) external view returns (bool);
}
