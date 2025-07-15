// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import {ElectionTypes} from './ElectionTypes.sol';
import {ElectionUtils} from './ElectionUtils.sol';
import {IBoardOfDirectors} from '../interfaces/IBoardOfDirectors.sol';

/**
 * @title Elections
 * @dev A contract that manages elections for the Board of Directors (BOD).
 */
contract Elections is Initializable, OwnableUpgradeable, PausableUpgradeable {
  // State variables
  uint256 private _nextElectionId;
  address public bodAddress;
  mapping(uint256 => ElectionTypes.Election) private _elections;
  uint256[] private _electionIds;
  mapping(uint256 => mapping(address => address)) private _votes;
  mapping(uint256 => mapping(address => uint256)) public _voteCounts;

  event ElectionCreated(
    uint256 indexed electionId,
    string title,
    address indexed createdBy,
    uint256 startDate,
    uint256 endDate,
    uint256 seatCount
  );

  event VoteSubmitted(uint256 indexed electionId, address indexed voter, address indexed candidate);

  event ResultsPublished(uint256 indexed electionId, address[] winners);

  // Custom errors
  error ElectionNotFound();
  error ElectionNotActive();
  error ElectionIsOngoing();
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

    if (_nextElectionId > 1 && !_elections[_nextElectionId - 1].resultsPublished) {
      revert ElectionIsOngoing();
    }
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
   * @dev Submits a vote for a candidate in an election
   * @param electionId The election ID
   * @param candidate The address of the candidate
   */
  function castVote(uint256 electionId, address candidate) external whenNotPaused {
    ElectionTypes.Election storage election = _elections[electionId];

    if (election.id == 0) revert ElectionNotFound();

    if (!ElectionUtils.isElectionActive(election.startDate, election.endDate)) {
      revert ElectionNotActive();
    }
    if (!election.isEligibleVoter[msg.sender]) revert NotEligibleVoter();
    if (election.hasVoted[msg.sender]) revert AlreadyVoted();
    ElectionUtils.validateVote(election, candidate);

    _votes[electionId][msg.sender] = candidate;
    _voteCounts[electionId][candidate]++;
    election.voteCount++;
    election.hasVoted[msg.sender] = true;

    emit VoteSubmitted(electionId, msg.sender, candidate);
  }

  /**
   * @dev Publishes election results (only callable by contract owner after election ends)
   * @param electionId The election ID
   */
  function publishResults(uint256 electionId) public onlyOwner whenNotPaused {
    ElectionTypes.Election storage election = _elections[electionId];

    if (election.id == 0) revert ElectionNotFound();
    if ( election.voteCount < election.seatCount && !ElectionUtils.hasElectionEnded(election.endDate)) {
      revert ResultsNotReady();
    }
    if (election.resultsPublished) revert ResultsAlreadyPublished();

    election.winners = getElectionResults(electionId);
    election.resultsPublished = true;
    if (election.winners.length > 0) {
      IBoardOfDirectors(bodAddress).setBoardOfDirectors(election.winners);
    }

    emit ResultsPublished(electionId, election.winners);
  }

  /**
   * @dev Gets the candidate that a specific voter voted for.
   * @param electionId The ID of the election.
   * @param voter The address of the voter.
   * @return The address of the candidate voted for, or the zero address if they haven't voted.
   */
  function getVoterChoice(uint256 electionId, address voter) external view returns (address) {
    if (_elections[electionId].id == 0) revert ElectionNotFound();
    return _votes[electionId][voter];
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

  function getElectionResults(uint256 electionId) public view returns (address[] memory) {
    ElectionTypes.Election storage election = _elections[electionId];
    address[] memory candidateList = election.candidateList;
    uint256 seatCount = election.seatCount;

    // Create a fixed-size array to hold the top candidates found so far.
    ElectionUtils.CandidateResult[] memory topCandidates = new ElectionUtils.CandidateResult[](
      seatCount
    );

    // Iterate through every candidate once.
    for (uint256 i = 0; i < candidateList.length; i++) {
      address currentCandidateAddress = candidateList[i];
      uint256 currentVoteCount = _voteCounts[electionId][currentCandidateAddress];

      // Check if the current candidate has more votes than the person with the
      // least votes currently in our `topCandidates` list.
      if (currentVoteCount > topCandidates[seatCount - 1].voteCount) {
        // Replace the last element with the new, higher-scoring candidate.
        topCandidates[seatCount - 1] = ElectionUtils.CandidateResult({
          candidateAddress: currentCandidateAddress,
          voteCount: currentVoteCount
        });

        // "Bubble" the new candidate up to their correct sorted position.
        for (uint256 j = seatCount - 1; j > 0; j--) {
          if (topCandidates[j].voteCount > topCandidates[j - 1].voteCount) {
            // Swap with the element above if the score is higher.
            ElectionUtils.CandidateResult memory temp = topCandidates[j];
            topCandidates[j] = topCandidates[j - 1];
            topCandidates[j - 1] = temp;
          } else {
            // Stop once the candidate is in the correct sorted position.
            break;
          }
        }
      }
    }

    // Extract just the addresses of the winners.
    address[] memory winners = new address[](seatCount);

    // If there are no winners, return an empty array.
    if (topCandidates.length == 0) return new address[](0);

    for (uint256 i = 0; i < seatCount; i++) {
      winners[i] = topCandidates[i].candidateAddress;
    }

    return winners;
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

  function setBoardOfDirectorsContractAddress(address _bodAddress) external {
    require(
      msg.sender == owner() || bodAddress == address(0),
      'Not allowed to set board of directors contract'
    );
    bodAddress = _bodAddress;
  }
}
