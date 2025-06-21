// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBoardOfDirectors {
  function setBoardOfDirectors(address[] memory _boardOfDirectors) external;
  function getBoardOfDirectors() external view returns (address[] memory);
}
