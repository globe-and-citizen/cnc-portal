// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IBoardOfDirectors} from "../interfaces/IBoardOfDirectors.sol";

contract MockBoardOfDirectors is IBoardOfDirectors {
  address[] private s_boardMembers;

  function getBoardMembers() external view returns (address[] memory) {
    return s_boardMembers;
  }

  function initialize(address[] memory owners) external {
    s_boardMembers = owners;
  }

  function setBoardOfDirectors(address[] memory members) external {
    s_boardMembers = members;
  }

  function addMember(address member) external {
    for (uint256 i = 0; i < s_boardMembers.length; i++) {
      if (s_boardMembers[i] == member) {
        revert("Member already exists");
      }
    }
    s_boardMembers.push(member);
  }

  function removeMember(address member) external {
    for (uint256 i = 0; i < s_boardMembers.length; i++) {
      if (s_boardMembers[i] == member) {
        s_boardMembers[i] = s_boardMembers[s_boardMembers.length - 1];
        s_boardMembers.pop();
        return;
      }
    }
    revert("Member not found");
  }

  function getBoardOfDirectors() external view returns (address[] memory) {
    return s_boardMembers;
  }

  function isMember(address account) external view returns (bool) {
    for (uint256 i = 0; i < s_boardMembers.length; i++) {
      if (s_boardMembers[i] == account) {
        return true;
      }
    }
    return false;
  }
}
