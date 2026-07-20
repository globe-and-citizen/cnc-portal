// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ElectionTypes} from "./ElectionTypes.sol";

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

  uint256 private constant MAX_CANDIDATES = 20;

  /**
   * @dev Error thrown when seat count is not odd
   */
  error ElectionUtils__InvalidSeatCount();

  /**
   * @dev Error thrown when date validation fails
   */
  error ElectionUtils__InvalidDates();

  /**
   * @dev Error thrown when candidate validation fails
   */
  error ElectionUtils__InvalidCandidate();

  /**
   * @dev Error thrown when there is ongoing election
   */
  error ElectionUtils__ElectionIsOngoing();

  /**
   * @dev Error thrown when there are insufficient candidates
   */
  error ElectionUtils__InsufficientCandidates();

  /**
   * @dev Error thrown when duplicate candidates are detected
   */
  error ElectionUtils__DuplicateCandidates();

  /**
   * @dev Error thrown when voter list is empty
   */
  error ElectionUtils__NoEligibleVoters();

  /**
   * @dev Error thrown when duplicate voters are detected
   */
  error ElectionUtils__DuplicateVoters();

  /**
   * @dev Validates election dates
   * @param startDate Election start timestamp
   * @param endDate Election end timestamp
   */
  function _validateDates(uint256 startDate, uint256 endDate) internal view {
    if (startDate <= block.timestamp || endDate <= startDate) revert ElectionUtils__InvalidDates();
  }

  /**
   * @dev Validates that `candidate` is a valid choice for the given election.
   * @param election The election storage reference.
   * @param candidate The candidate address being voted for.
   */
  function _validateVote(ElectionTypes.Election storage election, address candidate) internal view {
    // Check if candidate is valid
    if (candidate == address(0)) revert ElectionUtils__InvalidCandidate();
    bool isValidCandidate = false;
    uint256 length = election.candidateList.length;
    for (uint256 i = 0; i < length; ++i) {
      if (election.candidateList[i] == candidate) {
        isValidCandidate = true;
        break;
      }
    }
    if (!isValidCandidate) revert ElectionUtils__InvalidCandidate();
  }

  /**
   * @dev Checks if election is active (current time is between start and end dates)
   * @param startDate Election start timestamp
   * @param endDate Election end timestamp
   * @return True if election is currently active
   */
  function _isElectionActive(uint256 startDate, uint256 endDate) internal view returns (bool) {
    return block.timestamp >= startDate && block.timestamp <= endDate;
  }

  /**
   * @dev Checks if election has ended
   * @param endDate Election end timestamp
   * @return True if election has ended
   */
  function _hasElectionEnded(uint256 endDate) internal view returns (bool) {
    return block.timestamp > endDate;
  }

  /**
   * @dev Validates that seat count is odd
   * @param seatCount Number of seats to validate
   */
  function _validateSeatCount(uint256 seatCount) internal pure {
    if (seatCount == 0 || seatCount % 2 == 0) revert ElectionUtils__InvalidSeatCount();
  }

  /**
   * @dev Validates candidate list
   * @param candidates Array of candidates
   * @param seatCount Number of seats
   */
  function _validateCandidates(address[] memory candidates, uint256 seatCount) internal pure {
    if (candidates.length < seatCount) revert ElectionUtils__InsufficientCandidates();

    // Check for duplicate candidate addresses
    if (_isDuplicate(candidates)) revert ElectionUtils__DuplicateCandidates();
  }

  /**
   * @dev Validates eligible voters list
   * @param eligibleVoters Array of voter addresses
   */
  function _validateVoters(address[] memory eligibleVoters) internal pure {
    if (eligibleVoters.length == 0) revert ElectionUtils__NoEligibleVoters();

    // Check for duplicate voter addresses
    if (_isDuplicate(eligibleVoters)) revert ElectionUtils__DuplicateVoters();
  }

  /**
   * @dev Detects duplicate entries in an address list.
   * @param candidateOrVoters The list of addresses to check.
   * @return True if any duplicate is found.
   */
  function _isDuplicate(address[] memory candidateOrVoters) internal pure returns (bool) {
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
