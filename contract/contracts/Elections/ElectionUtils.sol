// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ElectionTypes} from './ElectionTypes.sol';

/**
 * @title ElectionUtils
 * @dev Utility functions for election validation and calculations
 */
library ElectionUtils {
  /**
   * @dev Represents a rank-order vote submitted by a voter
   */
  struct RankOrderVote {
    address voter;
    address[] rankedCandidates; // Ordered from most preferred to least
  }

  /**
   * @dev Candidate result with calculated points for sorting
   */
  struct CandidateResult {
    address candidateAddress;
    uint256 totalPoints;
    uint256 rank;
    bool isWinner;
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
   * @dev Error thrown when there is ongoing election
   */
  error ElectionIsOnGoing();

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
  function validateDates(
    uint256 startDate,
    uint256 endDate,
    ElectionTypes.Election storage currentElection
  ) internal view {
    if (startDate <= block.timestamp || endDate <= startDate) {
      revert InvalidDates();
    }
    if (!currentElection.resultsPublished && currentElection.id > 0) {
      revert ElectionIsOnGoing();
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

  /**
   * @dev Validates a rank-order vote
   * @param rankedCandidates Array of candidates in order of preference
   * @param candidates Election candidates for verification
   */
  function validateRankOrderVote(
    address[] memory rankedCandidates,
    address[] memory candidates
  ) internal pure {
    require(rankedCandidates.length > 0, 'Empty vote');
    require(rankedCandidates.length <= candidates.length, 'Too many candidates in vote');

    // Check for duplicates in vote
    for (uint256 i = 0; i < rankedCandidates.length; i++) {
      for (uint256 j = i + 1; j < rankedCandidates.length; j++) {
        require(rankedCandidates[i] != rankedCandidates[j], 'Duplicate candidate in vote');
      }
    }

    // Verify all candidates exist in election
    for (uint256 i = 0; i < rankedCandidates.length; i++) {
      bool found = false;
      for (uint256 j = 0; j < candidates.length; j++) {
        if (rankedCandidates[i] == candidates[j]) {
          found = true;
          break;
        }
      }
      require(found, 'Invalid candidate in vote');
    }
  }

  /**
   * @dev Calculates election results using modified Borda Count
   * @param votes Array of all votes
   * @param candidates Array of candidates
   * @param seatCount Number of seats to fill
   * @return results Array of candidate results sorted by points
   */
  function calculateResults(
    RankOrderVote[] memory votes,
    address[] memory candidates,
    uint256 seatCount
  ) internal pure returns (CandidateResult[] memory results) {
    results = new CandidateResult[](candidates.length);

    // Initialize results
    for (uint256 i = 0; i < candidates.length; i++) {
      results[i] = CandidateResult({
        candidateAddress: candidates[i],
        totalPoints: 0,
        rank: 0,
        isWinner: false
      });
    }

    // Calculate points for each candidate from all votes
    for (uint256 v = 0; v < votes.length; v++) {
      address[] memory rankedCandidates = votes[v].rankedCandidates;

      for (uint256 r = 0; r < rankedCandidates.length; r++) {
        address candidate = rankedCandidates[r];
        uint256 points = candidates.length - r; // Higher points for higher rank

        // Find the candidate in results and add points
        for (uint256 c = 0; c < results.length; c++) {
          if (results[c].candidateAddress == candidate) {
            results[c].totalPoints += points;
            break;
          }
        }
      }
    }

    // Sort results by points (bubble sort for simplicity)
    for (uint256 i = 0; i < results.length - 1; i++) {
      for (uint256 j = 0; j < results.length - i - 1; j++) {
        if (results[j].totalPoints < results[j + 1].totalPoints) {
          CandidateResult memory temp = results[j];
          results[j] = results[j + 1];
          results[j + 1] = temp;
        }
      }
    }

    // Assign ranks and mark winners
    for (uint256 i = 0; i < results.length; i++) {
      results[i].rank = i + 1;
      results[i].isWinner = i < seatCount;
    }

    return results;
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
