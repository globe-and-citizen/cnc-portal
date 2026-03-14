// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBoardOfDirectors
 * @dev Derived from: contracts/BoardOfDirectors.sol
 */
interface IBoardOfDirectors {
  /// @notice Initializes the contract with the initial set of owners
  /// @param _owners Initial set of owner addresses
  function initialize(address[] memory _owners) external;

  function setBoardOfDirectors(address[] memory _boardOfDirectors) external;

  function getBoardOfDirectors() external view returns (address[] memory);

  function isMember(address _address) external view returns (bool);
}
