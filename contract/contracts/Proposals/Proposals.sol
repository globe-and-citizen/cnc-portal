// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import {ReentrancyGuardUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import {IBoardOfDirectors} from '../interfaces/IBoardOfDirectors.sol';
import {ProposalUtils} from './ProposalUtils.sol';
import {IOfficer} from '../interfaces/IOfficer.sol';

/**
 * @title Proposals
 * @notice Allows the Board of Directors to create proposals, vote on them,
 *         and automatically calculate results.
 * @dev Upgradeable, pausable, reentrancy-guarded. BoardOfDirectors is resolved via Officer.
 */
contract Proposals is OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
  // --- State Variables ---
  /// @dev Proposal records by id.
  mapping(uint256 => Proposal) private proposals;
  /// @dev Id assigned to the next proposal.
  uint256 private _nextProposalId;
  /// @notice Address of the Officer contract used to locate BoardOfDirectors.
  address public officerAddress;

  // --- Enums and Structs ---
  /// @dev Directive vote options.
  enum VoteOption {
    Yes,
    No,
    Abstain
  }

  /// @dev Lifecycle state of a proposal.
  enum ProposalState {
    Active, // Proposal is currently open for voting
    Succeeded, // Proposal was approved
    Defeated, // Proposal was rejected
    Expired // Proposal voting period ended without a conclusive result (e.g., a tie)
  }

  /**
   * @dev Storage record of a proposal. Mappings are stored alongside vote tallies.
   * @param id Proposal id.
   * @param title Proposal title.
   * @param description Proposal description.
   * @param proposalType Category of proposal (e.g. "Budget", "Policy Change").
   * @param startDate Start timestamp.
   * @param endDate End timestamp.
   * @param creator Address that created the proposal.
   * @param voteCount Number of votes cast so far.
   * @param totalVoters Number of eligible voters at proposal creation.
   * @param yesCount Number of yes votes.
   * @param noCount Number of no votes.
   * @param abstainCount Number of abstain votes.
   * @param state Lifecycle state.
   * @param hasVoted Tracks which voters have already cast a vote.
   */
  struct Proposal {
    uint256 id;
    string title;
    string description;
    string proposalType; // e.g., "Budget", "Policy Change", etc.
    uint256 startDate;
    uint256 endDate;
    address creator;
    uint256 voteCount;
    uint256 totalVoters;
    uint256 yesCount;
    uint256 noCount;
    uint256 abstainCount;
    ProposalState state;
    mapping(address => bool) hasVoted;
  }

  /**
   * @dev Flat view of a proposal without mappings, suitable for returning externally.
   * @param id Proposal id.
   * @param title Proposal title.
   * @param description Proposal description.
   * @param proposalType Category of proposal.
   * @param startDate Start timestamp.
   * @param endDate End timestamp.
   * @param creator Address that created the proposal.
   * @param voteCount Number of votes cast so far.
   * @param totalVoters Number of eligible voters at proposal creation.
   * @param yesCount Number of yes votes.
   * @param noCount Number of no votes.
   * @param abstainCount Number of abstain votes.
   * @param state Lifecycle state.
   */
  struct ProposalView {
    uint256 id;
    string title;
    string description;
    string proposalType; // e.g., "Budget", "Policy Change", etc.
    uint256 startDate;
    uint256 endDate;
    address creator;
    uint256 voteCount;
    uint256 totalVoters;
    uint256 yesCount;
    uint256 noCount;
    uint256 abstainCount;
    ProposalState state;
  }

  // Custom errors
  /// @dev The proposal id does not exist.
  error ProposalNotFound();
  /// @dev Voting has not yet started for this proposal.
  error ProposalVotingNotStarted();
  /// @dev Voting has ended for this proposal.
  error ProposalVotingEnded();
  /// @dev The caller has already voted on this proposal.
  error ProposalAlreadyVoted();
  /// @dev The vote value is invalid.
  error InvalidVote();
  /// @dev The caller is not a member of the board of directors.
  error OnlyBoardMember();
  /// @dev The board of directors is empty.
  error NoBoardMembers();
  /// @dev The BoardOfDirectors address has not been configured.
  error BoardOfDirectorAddressNotSet();
  /// @dev The caller is not allowed to perform this action.
  error NotAllowed();
  /// @dev The caller (msg.sender) was the zero address when initializing.
  error ZeroSender();
  /// @dev The officer contract address has not been configured.
  error OfficerAddressNotSet();
  /// @dev The BoardOfDirectors contract could not be located via the Officer.
  error BoardOfDirectorsNotFound();

  // --- Events ---
  /**
   * @notice Emitted when a proposal is created.
   * @param proposalId The id of the new proposal.
   * @param title The proposal title.
   * @param creator The address that created the proposal.
   * @param startDate Voting start timestamp.
   * @param endDate Voting end timestamp.
   */
  event ProposalCreated(
    uint256 indexed proposalId,
    string title,
    address indexed creator,
    uint256 startDate,
    uint256 endDate
  );
  /**
   * @notice Emitted when a vote is cast on a proposal.
   * @param proposalId The proposal id.
   * @param voter The voter's address.
   * @param vote The chosen vote option.
   * @param timestamp Block timestamp of the vote.
   */
  event ProposalVoted(
    uint256 indexed proposalId,
    address indexed voter,
    VoteOption vote,
    uint256 timestamp
  );
  /**
   * @notice Emitted when proposal results are tallied.
   * @param proposalId The proposal id.
   * @param state Final state of the proposal.
   * @param yesCount Final yes count.
   * @param noCount Final no count.
   * @param abstainCount Final abstain count.
   */
  event ProposalTallyResults(
    uint256 indexed proposalId,
    ProposalState state,
    uint256 yesCount,
    uint256 noCount,
    uint256 abstainCount
  );

  /**
   * @notice Initializes the Proposals contract.
   * @param _owner Address that will own the contract.
   */
  function initialize(address _owner) public initializer {
    __Ownable_init(_owner);
    __Pausable_init();
    __ReentrancyGuard_init();
    _nextProposalId = 1; // Start proposal IDs from 1

    if (msg.sender == address(0)) revert ZeroSender();
    officerAddress = msg.sender;
  }

  /**
   * @notice Creates a new proposal. Only members of the board of directors can create proposals.
   * @param title The title of the proposal.
   * @param description The description of the proposal.
   * @param proposalType The category of the proposal (e.g. "Budget", "Policy Change").
   * @param startDate The start date of the proposal (in Unix timestamp).
   * @param endDate The end date of the proposal (in Unix timestamp).
   */
  function createProposal(
    string memory title,
    string memory description,
    string memory proposalType,
    uint256 startDate,
    uint256 endDate
  ) external boardOfDirectorsContractExists {
    ProposalUtils.validateProposalDates(startDate, endDate);
    ProposalUtils.validateProposalContent(title, description);

    address bodAddress = _getBoardOfDirectorsAddress();
    uint256 boardCount = IBoardOfDirectors(bodAddress).getBoardOfDirectors().length;
    if (boardCount == 0) revert NoBoardMembers();
    if (!IBoardOfDirectors(bodAddress).isMember(msg.sender)) {
      revert OnlyBoardMember();
    }

    Proposal storage newProposal = proposals[_nextProposalId];
    newProposal.id = _nextProposalId;
    newProposal.title = title;
    newProposal.description = description;
    newProposal.proposalType = proposalType;
    newProposal.startDate = startDate;
    newProposal.endDate = endDate;
    newProposal.creator = msg.sender;
    newProposal.voteCount = 0;
    newProposal.totalVoters = boardCount;
    newProposal.state = ProposalState.Active;

    emit ProposalCreated(_nextProposalId, title, msg.sender, startDate, endDate);
    _nextProposalId++;
  }

  /**
   * @dev Casts a vote for a proposal.
   * @param proposalId The ID of the proposal to vote on.
   * @param vote The vote option (Yes, No, Abstain).
   * @notice Only members of the board of directors can vote on proposals.
   */
  function castVote(
    uint256 proposalId,
    VoteOption vote
  ) external boardOfDirectorsContractExists onlyMember nonReentrant {
    Proposal storage proposal = proposals[proposalId];
    if (proposal.id == 0) revert ProposalNotFound();
    if (block.timestamp < proposal.startDate) revert ProposalVotingNotStarted();
    if (block.timestamp > proposal.endDate) revert ProposalVotingEnded();
    if (proposal.hasVoted[msg.sender]) revert ProposalAlreadyVoted();

    // Mark the voter as having voted
    proposal.hasVoted[msg.sender] = true;
    proposal.voteCount++;

    // Increment the vote count based on the option chosen
    if (vote == VoteOption.Yes) {
      proposal.yesCount++;
    } else if (vote == VoteOption.No) {
      proposal.noCount++;
    } else if (vote == VoteOption.Abstain) {
      proposal.abstainCount++;
    }

    emit ProposalVoted(proposalId, msg.sender, vote, block.timestamp);

    if (proposal.voteCount == proposal.totalVoters) tallyResults(proposalId);
  }

  /**
   * @dev Retrieves information about a specific proposal.
   * @param proposalId The ID of the proposal to retrieve.
   * @return ProposalView containing the proposal details.
   */
  function getProposal(uint256 proposalId) external view returns (ProposalView memory) {
    Proposal storage proposal = proposals[proposalId];
    if (proposal.id == 0) {
      revert ProposalNotFound();
    }

    return
      ProposalView({
        id: proposal.id,
        title: proposal.title,
        description: proposal.description,
        proposalType: proposal.proposalType,
        startDate: proposal.startDate,
        endDate: proposal.endDate,
        creator: proposal.creator,
        voteCount: proposal.voteCount,
        totalVoters: proposal.totalVoters,
        yesCount: proposal.yesCount,
        noCount: proposal.noCount,
        abstainCount: proposal.abstainCount,
        state: proposal.state
      });
  }

  /**
   * @dev Tally the results of a proposal after voting has ended.
   * @param proposalId The ID of the proposal to tally.
   * @notice This function is called automatically when all board members have voted.
   */
  function tallyResults(uint256 proposalId) public onlyMember {
    Proposal storage proposal = proposals[proposalId];
    if (proposal.id == 0) revert ProposalNotFound();
    if (block.timestamp < proposal.startDate) revert ProposalVotingNotStarted();

    if (proposal.yesCount > proposal.noCount) {
      proposal.state = ProposalState.Succeeded;
    } else if (proposal.noCount > proposal.yesCount) {
      proposal.state = ProposalState.Defeated;
    } else {
      proposal.state = ProposalState.Expired; // Tie or no conclusive result
    }

    emit ProposalTallyResults(
      proposalId,
      proposal.state,
      proposal.yesCount,
      proposal.noCount,
      proposal.abstainCount
    );
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

  /**
   * @notice Returns the current Board of Directors members.
   * @return Array of BOD member addresses.
   */
  function getBoardOfDirectors()
    external
    view
    boardOfDirectorsContractExists
    returns (address[] memory)
  {
    address bodAddress = _getBoardOfDirectorsAddress();
    IBoardOfDirectors boardOfDirectors = IBoardOfDirectors(bodAddress);
    return boardOfDirectors.getBoardOfDirectors();
  }

  /**
   * @notice Returns whether a voter has already voted on a proposal.
   * @param proposalId Id of the proposal.
   * @param voter Voter address to check.
   * @return True if the voter has voted.
   */
  function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
    Proposal storage proposal = proposals[proposalId];
    if (proposal.id == 0) revert ProposalNotFound();
    return proposal.hasVoted[voter];
  }

  modifier onlyMember() {
    address bodAddress = _getBoardOfDirectorsAddress();
    if (!IBoardOfDirectors(bodAddress).isMember(msg.sender)) {
      revert OnlyBoardMember();
    }
    _;
  }

  modifier boardOfDirectorsContractExists() {
    _getBoardOfDirectorsAddress(); // Will revert if not found
    _;
  }
}
