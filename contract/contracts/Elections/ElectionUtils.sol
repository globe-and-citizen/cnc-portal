// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ElectionTypes} from './ElectionTypes.sol';

/**
 * @title ElectionUtils
 * @dev Utility functions for election validation and calculations
 */
library ElectionUtils {
  /**
   * @dev Candidate result with calculated points for sorting
   */
  struct CandidateResult {
    address candidateAddress;
    uint256 voteCount;
  }

  /**
   * @dev Error thrown when seat count is not odd
   */
  error InvalidSeatCount();

  /**
   * @dev Error thrown when date validation fails
   */
  error InvalidDates();

  /**
   * @dev Error thrown when candidate validation fails
   */
  error InvalidCandidate();

  /**
   * @dev Error thrown when there is ongoing election
   */
  error ElectionIsOngoing();

  /**
   * @dev Error thrown when there are insufficient candidates
   */
  error InsufficientCandidates();

  /**
   * @dev Error thrown when duplicate candidates are detected
   */
  error DuplicateCandidates();

  /**
   * @dev Error thrown when voter list is empty
   */
  error NoEligibleVoters();

  /**
   * @dev Error thrown when duplicate voters are detected
   */
  error DuplicateVoters();

  uint256 private constant MAX_CANDIDATES = 20;

  /**
   * @dev Validates that seat count is odd
   * @param seatCount Number of seats to validate
   */
  function validateSeatCount(uint256 seatCount) internal pure {
    if (seatCount == 0 || seatCount % 2 == 0) {
      revert InvalidSeatCount();
    }
  }

  /**
   * @dev Validates election dates
   * @param startDate Election start timestamp
   * @param endDate Election end timestamp
   */
  function validateDates(uint256 startDate, uint256 endDate) internal view {
    if (startDate <= block.timestamp || endDate <= startDate) {
      revert InvalidDates();
    }
  }

  /**
   * @dev Validates candidate list
   * @param candidates Array of candidates
   * @param seatCount Number of seats
   */
  function validateCandidates(address[] memory candidates, uint256 seatCount) internal pure {
    if (candidates.length < seatCount) {
      revert InsufficientCandidates();
    }

    // Check for duplicate candidate addresses
    if (isDuplicate(candidates)) {
      revert DuplicateCandidates();
    }
  }

  /**
   * @dev Validates eligible voters list
   * @param eligibleVoters Array of voter addresses
   */
  function validateVoters(address[] memory eligibleVoters) internal pure {
    if (eligibleVoters.length == 0) {
      revert NoEligibleVoters();
    }

    // Check for duplicate voter addresses
    if (isDuplicate(eligibleVoters)) {
      revert DuplicateVoters();
    }
  }

  function validateVote(ElectionTypes.Election storage election, address candidate) internal view {
    // Check if candidate is valid
    if (candidate == address(0)) {
      revert InvalidCandidate();
    }
    bool isValidCandidate = false;
    for (uint256 i = 0; i < election.candidateList.length; i++) {
      if (election.candidateList[i] == candidate) {
        isValidCandidate = true;
        break;
      }
    }
    if (!isValidCandidate) {
      revert InvalidCandidate();
    }
  }

  /**
   * @dev Checks if election is active (current time is between start and end dates)
   * @param startDate Election start timestamp
   * @param endDate Election end timestamp
   * @return True if election is currently active
   */
  function isElectionActive(uint256 startDate, uint256 endDate) internal view returns (bool) {
    return block.timestamp >= startDate && block.timestamp <= endDate;
  }

  /**
   * @dev Checks if election has ended
   * @param endDate Election end timestamp
   * @return True if election has ended
   */
  function hasElectionEnded(uint256 endDate) internal view returns (bool) {
    return block.timestamp > endDate;
  }

  function isDuplicate(address[] memory candidateOrVoters) internal pure returns (bool) {
    for (uint256 i = 0; i < candidateOrVoters.length; i++) {
      for (uint256 j = i + 1; j < candidateOrVoters.length; j++) {
        if (candidateOrVoters[i] == candidateOrVoters[j]) {
          return true; // Duplicate found
        }
      }
    }
    return false; // No duplicates
  }
}
