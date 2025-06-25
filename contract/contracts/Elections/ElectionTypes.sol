// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ElectionTypes
 * @dev Gas-optimized data structures for the Elections contract
 * @notice Optimizes for frequent operations: voter eligibility checks and voting
 */
library ElectionTypes {
  /**
   * @dev Gas-optimized election structure
   * Optimizes for:
   * 1. Voter eligibility checks (most frequent) - O(1) with mapping
   * 2. Voting operations (frequent) - minimal gas
   * 3. Setup costs (infrequent) - acceptable higher cost
   */
  struct Election {
    uint256 id;
    string title;
    string description;
    address createdBy; // Team owner who created this election
    uint256 startDate; // Block timestamp
    uint256 endDate; // Block timestamp
    uint256 seatCount; // Number of BOD seats (must be odd)
    
    // Gas-optimized voter eligibility: O(1) lookup (~200 gas vs ~800 gas with EnumerableSet)
    mapping(address => bool) isEligibleVoter;
    
    // Gas-optimized candidate checking: O(1) lookup
    mapping(address => bool) isCandidate;
    
    // Arrays for iteration when needed (setup cost, but gas-efficient reads)
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
