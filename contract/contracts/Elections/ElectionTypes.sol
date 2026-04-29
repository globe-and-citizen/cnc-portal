// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ElectionTypes
 * @dev Gas-optimized data structures for the Elections contract
 * @notice Optimizes for frequent operations: voter eligibility checks and voting
 */
library ElectionTypes {
  /**
   * @dev Full election record including configuration, voter state, and results.
   * @param id Election identifier.
   * @param title Election title.
   * @param description Election description.
   * @param createdBy Team owner who created this election.
   * @param startDate Start timestamp (block time).
   * @param endDate End timestamp (block time).
   * @param seatCount Number of BOD seats to fill (must be odd).
   * @param isEligibleVoter Lookup of voter eligibility.
   * @param isCandidate Lookup of candidacy.
   * @param candidateList List of candidate addresses.
   * @param voterList List of eligible voter addresses.
   * @param hasVoted Tracks which voters have cast a vote.
   * @param winners Published winners after results are finalized.
   * @param resultsPublished True once results have been published.
   * @param voteCount Running total of votes cast.
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
