// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBoardOfDirectors
 * @dev Derived from: contracts/BoardOfDirectors.sol
 */
interface IBoardOfDirectors {
  function setBoardOfDirectors(address[] memory _boardOfDirectors) external;

  function getBoardOfDirectors() external view returns (address[] memory);

  function isMember(address _address) external view returns (bool);
}
