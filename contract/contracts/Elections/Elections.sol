// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import {ElectionTypes} from './ElectionTypes.sol';
import {ElectionUtils} from './ElectionUtils.sol';
import {IBoardOfDirectors} from '../interfaces/IBoardOfDirectors.sol';
import {IOfficer} from '../interfaces/IOfficer.sol';

/**
 * @title Elections
 * @dev A contract that manages elections for the Board of Directors (BOD).
 */
contract Elections is Initializable, OwnableUpgradeable, PausableUpgradeable {
  // State variables
  /// @dev Id assigned to the next election created.
  uint256 private _nextElectionId;
  /// @notice Address of the Officer contract used to locate BoardOfDirectors.
  address public officerAddress;
  /// @dev Stored election records keyed by election id.
  mapping(uint256 => ElectionTypes.Election) private _elections;
  /// @dev List of all election ids created so far.
  uint256[] private _electionIds;
  /// @dev Per-election record of each voter's candidate choice.
  mapping(uint256 => mapping(address => address)) private _votes;
  /// @notice Vote count per candidate for each election.
  mapping(uint256 => mapping(address => uint256)) public _voteCounts;

  /**
   * @notice Emitted when a new election is created.
   * @param electionId Id of the created election.
   * @param title Election title.
   * @param createdBy Address that created the election.
   * @param startDate Election start timestamp.
   * @param endDate Election end timestamp.
   * @param seatCount Number of BOD seats to fill.
   */
  event ElectionCreated(
    uint256 indexed electionId,
    string title,
    address indexed createdBy,
    uint256 startDate,
    uint256 endDate,
    uint256 seatCount
  );

  /**
   * @notice Emitted when a voter casts a vote.
   * @param electionId Id of the election.
   * @param voter The voting address.
   * @param candidate The candidate voted for.
   */
  event VoteSubmitted(uint256 indexed electionId, address indexed voter, address indexed candidate);

  /**
   * @notice Emitted when election results are published.
   * @param electionId Id of the election.
   * @param winners The winning candidate addresses.
   */
  event ResultsPublished(uint256 indexed electionId, address[] winners);

  // Custom errors
  /// @dev The election id does not exist.
  error ElectionNotFound();
  /// @dev The election is not currently accepting votes.
  error ElectionNotActive();
  /// @dev A previous election has not yet concluded.
  error ElectionIsOngoing();
  /// @dev The election has already ended.
  error ElectionEnded();
  /// @dev The caller has already voted in this election.
  error AlreadyVoted();
  /// @dev The caller is not in the eligible voter list.
  error NotEligibleVoter();
  /// @dev Election results have already been published.
  error ResultsAlreadyPublished();
  /// @dev Results cannot be published yet.
  error ResultsNotReady();
  /// @dev The caller is not authorized for this action.
  error Unauthorized();
  /// @dev The caller (msg.sender) was the zero address when initializing.
  error ZeroSender();
  /// @dev The officer contract address has not been configured.
  error OfficerAddressNotSet();
  /// @dev The BoardOfDirectors contract could not be located via the Officer.
  error BoardOfDirectorsNotFound();

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializes the Elections contract.
   * @param _owner Address that will own the contract.
   */
  function initialize(address _owner) public initializer {
    __Ownable_init(_owner);
    __Pausable_init();
    _nextElectionId = 1;

    if (msg.sender == address(0)) revert ZeroSender();
    officerAddress = msg.sender;
  }

  /// @notice Pauses the contract.
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpauses the contract.
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
    if (
      election.voteCount < election.voterList.length &&
      !ElectionUtils.hasElectionEnded(election.endDate)
    ) {
      revert ResultsNotReady();
    }
    if (election.resultsPublished) revert ResultsAlreadyPublished();

    election.winners = getElectionResults(electionId);
    election.resultsPublished = true;
    if (election.winners.length > 0) {
      address bodAddress = _getBoardOfDirectorsAddress();
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

  /**
   * @notice Returns the candidate list for an election.
   * @param electionId Id of the election.
   * @return candidates Array of candidate addresses.
   */
  function getElectionCandidates(
    uint256 electionId
  ) external view returns (address[] memory candidates) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.candidateList;
  }

  /**
   * @notice Returns the eligible voter list for an election.
   * @param electionId Id of the election.
   * @return voters Array of eligible voter addresses.
   */
  function getElectionEligibleVoters(
    uint256 electionId
  ) external view returns (address[] memory voters) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.voterList;
  }

  /**
   * @notice Returns the winners of a published election.
   * @param electionId Id of the election.
   * @return Array of winning candidate addresses.
   */
  function getElectionWinners(uint256 electionId) external view returns (address[] memory) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();
    if (!election.resultsPublished) revert ResultsNotReady();

    return election.winners;
  }

  /**
   * @notice Computes the current top candidates for an election without publishing.
   * @param electionId Id of the election.
   * @return Array of winning candidate addresses sized to the seat count.
   */
  function getElectionResults(uint256 electionId) public view returns (address[] memory) {
    ElectionTypes.Election storage election = _elections[electionId];
    address[] memory candidateList = election.candidateList;
    uint256 seatCount = election.seatCount;

    // Create array to store all candidates with their vote counts
    ElectionUtils.CandidateResult[] memory allCandidates = new ElectionUtils.CandidateResult[](
      candidateList.length
    );

    // Populate the array with all candidates and their vote counts
    for (uint256 i = 0; i < candidateList.length; i++) {
      allCandidates[i] = ElectionUtils.CandidateResult({
        candidateAddress: candidateList[i],
        voteCount: _voteCounts[electionId][candidateList[i]]
      });
    }

    // Sort candidates by vote count (descending) using bubble sort
    for (uint256 i = 0; i < allCandidates.length - 1; i++) {
      for (uint256 j = 0; j < allCandidates.length - i - 1; j++) {
        if (allCandidates[j].voteCount < allCandidates[j + 1].voteCount) {
          ElectionUtils.CandidateResult memory temp = allCandidates[j];
          allCandidates[j] = allCandidates[j + 1];
          allCandidates[j + 1] = temp;
        }
        // Tie-breaking: if vote counts are equal, use address comparison for deterministic result
        else if (
          allCandidates[j].voteCount == allCandidates[j + 1].voteCount &&
          allCandidates[j].candidateAddress > allCandidates[j + 1].candidateAddress
        ) {
          ElectionUtils.CandidateResult memory temp = allCandidates[j];
          allCandidates[j] = allCandidates[j + 1];
          allCandidates[j + 1] = temp;
        }
      }
    }

    // Extract winners, ensuring we always return the required number of seats
    address[] memory winners = new address[](seatCount);

    for (uint256 i = 0; i < seatCount; i++) {
      winners[i] = allCandidates[i].candidateAddress;
    }

    return winners;
  }

  /**
   * @notice Returns whether a voter has already voted in an election.
   * @param electionId Id of the election.
   * @param voter Voter address to check.
   * @return True if the voter has already cast their vote.
   */
  function hasVoted(uint256 electionId, address voter) external view returns (bool) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.hasVoted[voter];
  }

  /**
   * @notice Returns whether a voter is eligible in an election.
   * @param electionId Id of the election.
   * @param voter Voter address to check.
   * @return True if the voter is eligible.
   */
  function isEligibleVoter(uint256 electionId, address voter) external view returns (bool) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.isEligibleVoter[voter];
  }

  /**
   * @notice Returns the total votes cast in an election.
   * @param electionId Id of the election.
   * @return The number of votes cast.
   */
  function getVoteCount(uint256 electionId) external view returns (uint256) {
    ElectionTypes.Election storage election = _elections[electionId];
    if (election.id == 0) revert ElectionNotFound();

    return election.voteCount;
  }

  /// @notice Returns the id that will be assigned to the next election.
  function getNextElectionId() external view returns (uint256) {
    return _nextElectionId;
  }

  /**
   * @dev Internal helper to get BoardOfDirectors contract address from Officer
   * @return Address of the BoardOfDirectors contract
   */
  function _getBoardOfDirectorsAddress() internal view returns (address) {
    if (officerAddress == address(0)) revert OfficerAddressNotSet();
    address bodAddress = IOfficer(officerAddress).findDeployedContract('BoardOfDirectors');
    if (bodAddress == address(0)) revert BoardOfDirectorsNotFound();
    return bodAddress;
  }
}
