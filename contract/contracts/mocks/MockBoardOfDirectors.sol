// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '../interfaces/IBoardOfDirectors.sol';

contract MockBoardOfDirectors is IBoardOfDirectors {
  address[] public boardMembers;

  function initialize() external {}

  function setBoardOfDirectors(address[] memory _members) external {
    boardMembers = _members;
  }

  function getBoardOfDirectors() external view returns (address[] memory) {
    return boardMembers;
  }

  function isMember(address _address) external view returns (bool) {
    for (uint256 i = 0; i < boardMembers.length; i++) {
      if (boardMembers[i] == _address) {
        return true;
      }
    }
    return false;
  }

  function addMember(address _member) external {
    for (uint256 i = 0; i < boardMembers.length; i++) {
      if (boardMembers[i] == _member) {
        revert('Member already exists');
      }
    }
    boardMembers.push(_member);
  }

    function removeMember(address _member) external {
        for (uint256 i = 0; i < boardMembers.length; i++) {
        if (boardMembers[i] == _member) {
            boardMembers[i] = boardMembers[boardMembers.length - 1];
            boardMembers.pop();
            return;
        }
        }
        revert('Member not found');
    }
}
