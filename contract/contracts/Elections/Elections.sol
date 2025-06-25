// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import {ElectionTypes} from './ElectionTypes.sol';
import {ElectionUtils} from './ElectionUtils.sol';

/**
 * @title Elections
 * @dev Contract for managing Board of Directors elections with rank-order voting
 * @notice This contract allows team owners to create elections, eligible voters to submit
 *         rank-order votes, and automatically calculates results using modified Borda Count
 */
contract Elections is Initializable, OwnableUpgradeable, PausableUpgradeable {
  // State variables
  uint256 private _nextElectionId;
  mapping(uint256 => ElectionTypes.Election) private _elections;
  uint256[] private _electionIds;
  mapping(uint256 => mapping(address => address[])) private _votes;

  event ElectionCreated(
    uint256 indexed electionId,
    string title,
    address indexed createdBy,
    uint256 startDate,
    uint256 endDate,
    uint256 seatCount
  );

  event VoteSubmitted(uint256 indexed electionId, address indexed voter);

  event ResultsPublished(uint256 indexed electionId, address[] winners);

  // Custom errors
  error ElectionNotFound();
  error ElectionNotActive();
  error ElectionEnded();
  error AlreadyVoted();
  error NotEligibleVoter();
  error ResultsAlreadyPublished();
  error ResultsNotReady();
  error Unauthorized();

  function initialize(address _owner) public initializer {
    __Ownable_init(_owner);
    __Pausable_init();
    _nextElectionId = 1;
  }

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }

  /**
   * @dev Creates a new election
   * @param title Election title
   * @param description Election description
   * @param startDate Election start timestamp
   * @param endDate Election end timestamp
   * @param seatCount Number of BOD seats (must be odd)
   * @param candidates Array of candidates
   * @param eligibleVoters Array of eligible voter addresses
   * @return electionId The ID of the created election
   */
  function createElection(
    string memory title,
    string memory description,
    uint256 startDate,
    uint256 endDate,
    uint256 seatCount,
    address[] memory candidates,
    address[] memory eligibleVoters
  ) external onlyOwner whenNotPaused returns (uint256 electionId) {
    ElectionUtils.validateSeatCount(seatCount);
    ElectionUtils.validateDates(startDate, endDate);
    ElectionUtils.validateCandidates(candidates, seatCount);
    ElectionUtils.validateVoters(eligibleVoters);

    electionId = _nextElectionId++;
    ElectionTypes.Election storage election = _elections[electionId];

    election.id = electionId;
    election.title = title;
    election.description = description;
    election.createdBy = msg.sender;
    election.startDate = startDate;
    election.endDate = endDate;
    election.seatCount = seatCount;
    election.resultsPublished = false;
    election.voteCount = 0;

    for (uint256 i = 0; i < candidates.length; i++) {
      election.isCandidate[candidates[i]] = true;
      election.candidateList.push(candidates[i]);
    }

    for (uint256 i = 0; i < eligibleVoters.length; i++) {
      election.isEligibleVoter[eligibleVoters[i]] = true;
      election.voterList.push(eligibleVoters[i]);
    }

    _electionIds.push(electionId);

    emit ElectionCreated(electionId, title, msg.sender, startDate, endDate, seatCount);

    return electionId;
  }

  /**
   * @dev Submits a rank-order vote for an election
   * @param electionId The election ID
   * @param rankedCandidates Array of candidate addresses in order of preference
   */
  function submitRankOrderVote(
    uint256 electionId,
    address[] memory rankedCandidates
  ) external whenNotPaused {
    ElectionTypes.Election storage election = _elections[electionId];

    if (election.id == 0) revert ElectionNotFound();

    if (!ElectionUtils.isElectionActive(election.startDate, election.endDate)) {
      revert ElectionNotActive();
    }
    if (!election.isEligibleVoter[msg.sender]) revert NotEligibleVoter();
    if (election.hasVoted[msg.sender]) revert AlreadyVoted();

    address[] memory candidates = election.candidateList;
    ElectionUtils.validateRankOrderVote(rankedCandidates, candidates);

    _votes[electionId][msg.sender] = rankedCandidates;
    election.voteCount++;
    election.hasVoted[msg.sender] = true;

    emit VoteSubmitted(electionId, msg.sender);
  }

  /**
   * @dev Publishes election results (only callable by contract owner after election ends)
   * @param electionId The election ID
   */
  function publishResults(uint256 electionId) external onlyOwner whenNotPaused {
    ElectionTypes.Election storage election = _elections[electionId];

    if (election.id == 0) revert ElectionNotFound();
    if (!ElectionUtils.hasElectionEnded(election.endDate)) {
      revert ResultsNotReady();
    }
    if (election.resultsPublished) revert ResultsAlreadyPublished();

    // Reconstruct votes from storage for Borda Count calculation
    ElectionUtils.RankOrderVote[] memory votes = new ElectionUtils.RankOrderVote[](
      election.voteCount
    );
    uint256 voteIndex = 0;

    for (uint256 i = 0; i < election.voterList.length; i++) {
      address voter = election.voterList[i];
      if (election.hasVoted[voter]) {
        votes[voteIndex] = ElectionUtils.RankOrderVote({
          voter: voter,
          rankedCandidates: _votes[electionId][voter]
        });
        voteIndex++;
      }
    }

    address[] memory candidates = election.candidateList;

    ElectionUtils.CandidateResult[] memory results = ElectionUtils.calculateResults(
      votes,
      candidates,
      election.seatCount
    );

    for (uint256 i = 0; i < results.length; i++) {
      if (results[i].isWinner) {
        election.winners.push(results[i].candidateAddress);
      }
    }

    election.resultsPublished = true;

    emit ResultsPublished(electionId, election.winners);
  }

  /**
   * @dev Gets basic election information
   */
  function getElection(
    uint256 electionId
  )
    external
    view
    returns (
      uint256 id,
      string memory title,
      string memory description,
      address createdBy,
      uint256 startDate,
      uint256 endDate,
      uint256 seatCount,
      bool resultsPublished
    )
  {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return (
      election.id,
      election.title,
      election.description,
      election.createdBy,
      election.startDate,
      election.endDate,
      election.seatCount,
      election.resultsPublished
    );
  }

  function getElectionCandidates(
    uint256 electionId
  ) external view returns (address[] memory candidates) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.candidateList;
  }

  function getElectionEligibleVoters(
    uint256 electionId
  ) external view returns (address[] memory voters) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.voterList;
  }

  function getElectionWinners(uint256 electionId) external view returns (address[] memory) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();
    if (!election.resultsPublished) revert ResultsNotReady();

    return election.winners;
  }

  /**
   * @dev Gets detailed election results with Borda Count points and rankings
   */
  function getElectionResults(
    uint256 electionId
  ) external view returns (ElectionUtils.CandidateResult[] memory results) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();
    if (!election.resultsPublished) revert ResultsNotReady();

    // Reconstruct votes for result calculation
    ElectionUtils.RankOrderVote[] memory votes = new ElectionUtils.RankOrderVote[](
      election.voteCount
    );
    uint256 voteIndex = 0;

    for (uint256 i = 0; i < election.voterList.length; i++) {
      address voter = election.voterList[i];
      if (election.hasVoted[voter]) {
        votes[voteIndex] = ElectionUtils.RankOrderVote({
          voter: voter,
          rankedCandidates: _votes[electionId][voter]
        });
        voteIndex++;
      }
    }

    address[] memory candidates = election.candidateList;

    return ElectionUtils.calculateResults(votes, candidates, election.seatCount);
  }

  function hasVoted(uint256 electionId, address voter) external view returns (bool) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.hasVoted[voter];
  }

  function isEligibleVoter(uint256 electionId, address voter) external view returns (bool) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.isEligibleVoter[voter];
  }

  function getVoteCount(uint256 electionId) external view returns (uint256) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.voteCount;
  }

  function getNextElectionId() external view returns (uint256) {
    return _nextElectionId;
  }
}
