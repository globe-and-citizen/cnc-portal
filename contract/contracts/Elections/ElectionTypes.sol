// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ElectionTypes
 * @dev Gas-optimized data structures for the Elections contract
 * @notice Optimizes for frequent operations: voter eligibility checks and voting
 */
library ElectionTypes {
  /**
   * @notice Struct for an election
   */
  struct Election {
    uint256 id;
    string title;
    string description;
    address createdBy; // Team owner who created this election
    uint256 startDate; // Block timestamp
    uint256 endDate; // Block timestamp
    uint256 seatCount; // Number of BOD seats (must be odd)
    mapping(address => bool) isEligibleVoter;
    mapping(address => bool) isCandidate;
    address[] candidateList;
    address[] voterList;
    // Vote tracking
    mapping(address => bool) hasVoted;
    // Results
    address[] winners;
    bool resultsPublished;
    uint256 voteCount;
  }
}
