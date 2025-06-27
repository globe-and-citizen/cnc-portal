// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '../interfaces/IBoardOfDirectors.sol';

contract MockBoardOfDirectors is IBoardOfDirectors {
  address[] public boardMembers;

  function setBoardOfDirectors(address[] memory _members) external {
    boardMembers = _members;
  }

  function getBoardOfDirectors() external view returns (address[] memory) {
    return boardMembers;
  }
}
