// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import {ReentrancyGuardUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import {IBoardOfDirectors} from '../interfaces/IBoardOfDirectors.sol';
import {ProposalUtils} from './ProposalUtils.sol';
import "hardhat/console.sol";

/*
 * @title Proposals
 * @dev A contract that manages proposals for the Board of Directors (BOD).
 * @notice This contract allows board of directors to create proposals, vote on them,
 * and automatically calculates results.
 */
contract Proposals is OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
  // --- State Variables ---
  mapping(uint256 => Proposal) private proposals;
  uint256 private _nextProposalId;
  address private boardOfDirectorsContractAddress;
  uint256 private initBodAddress;

  // --- Enums and Structs ---
  enum VoteOption {
    Yes,
    No,
    Abstain
  }

  enum ProposalState {
    Active, // Proposal is currently open for voting
    Succeeded, // Proposal was approved
    Defeated, // Proposal was rejected
    Expired // Proposal voting period ended without a conclusive result (e.g., a tie)
  }

  struct Proposal {
    uint256 id;
    string title;
    string description;
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

  // Custom errors
  error ProposalNotFound();
  error ProposalVotingNotStarted();
  error ProposalVotingEnded();
  error ProposalAlreadyVoted();
  error InvalidVote();
  error OnlyBoardMember();
  error NoBoardMembers();
  error BoardOfDirectorAddressNotSet();
  error NoBoardOfDirectors();

  // --- Events ---
  event ProposalCreated(
    uint256 indexed proposalId,
    string title,
    address indexed creator,
    uint256 startDate,
    uint256 endDate
  );
  event ProposalVoted(uint256 indexed proposalId, address indexed voter);
  event ProposalTallyResults(uint256 indexed proposalId, ProposalState state);

  function initialize(address _owner) public initializer {
    __Ownable_init(_owner);
    __Pausable_init();
    __ReentrancyGuard_init();
    _nextProposalId = 1; // Start proposal IDs from 1
  }

  /**
   * @dev Creates a new proposal.
   * @param title The title of the proposal.
   * @param description The description of the proposal.
   * @param startDate The start date of the proposal (in Unix timestamp).
   * @param endDate The end date of the proposal (in Unix timestamp).
   * @notice Only members of the board of directors can create proposals.
   */
  function createProposal(
    string memory title,
    string memory description,
    uint256 startDate,
    uint256 endDate
  ) external boardOfDirectorsContractExists onlyMember {
    ProposalUtils.validateProposalDates(startDate, endDate);
    ProposalUtils.validateProposalContent(title, description);

    uint256 boardCount = IBoardOfDirectors(boardOfDirectorsContractAddress)
      .getBoardOfDirectors()
      .length;
    if (boardCount == 0) revert NoBoardMembers();

    Proposal storage newProposal = proposals[_nextProposalId];
    newProposal.id = _nextProposalId;
    newProposal.title = title;
    newProposal.description = description;
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

    emit ProposalVoted(proposalId, msg.sender);

    if (proposal.voteCount == proposal.totalVoters) tallyResults(proposalId);
  }

  /**
   * @dev Retrieves information about a specific proposal.
   * @param proposalId The ID of the proposal to retrieve.
   * @return id The ID of the proposal.
   * @return title The title of the proposal.
   * @return description The description of the proposal.
   * @return startDate The start date of the proposal (in Unix timestamp).
   * @return endDate The end date of the proposal (in Unix timestamp).
   * @return creator The address of the proposal creator.
   * @return voteCount The total number of votes cast for the proposal.
   * @return yesCount The number of "Yes" votes.
   * @return noCount The number of "No" votes.
   * @return abstainCount The number of abstentions.
   * @return state The current state of the proposal.
   */
  function getProposal(
    uint256 proposalId
  )
    external
    view
    returns (
      uint256 id,
      string memory title,
      string memory description,
      uint256 startDate,
      uint256 endDate,
      address creator,
      uint256 voteCount,
      uint256 yesCount,
      uint256 noCount,
      uint256 abstainCount,
      ProposalState state
    )
  {
    Proposal storage proposal = proposals[proposalId];
    if (proposal.id == 0) {
      revert ProposalNotFound();
    }

    return (
      proposal.id,
      proposal.title,
      proposal.description,
      proposal.startDate,
      proposal.endDate,
      proposal.creator,
      proposal.voteCount,
      proposal.yesCount,
      proposal.noCount,
      proposal.abstainCount,
      proposal.state
    );
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

    Proposal storage proposa = proposals[proposalId];
    if (proposa.yesCount > proposa.noCount) {
      proposa.state = ProposalState.Succeeded;
    } else if (proposa.noCount > proposa.yesCount) {
      proposa.state = ProposalState.Defeated;
    } else {
      proposa.state = ProposalState.Expired; // Tie or no conclusive result
    }
  }

  /**
   * @dev Sets the address of the Board of Directors contract.
   * @param _boardOfDirectorsContractAddress The address of the Board of Directors contract.
   * @notice Only the owner or if the address has not been set can call this function.
   */
  function setBoardOfDirectorsContractAddress(address _boardOfDirectorsContractAddress) external {
    require(
      msg.sender == owner() || boardOfDirectorsContractAddress == address(0),
      'Not allowed to set board of directors contract'
    );
    boardOfDirectorsContractAddress = _boardOfDirectorsContractAddress;
  }

  function getBoardOfDirectors()
    external
    view
    boardOfDirectorsContractExists
    returns (address[] memory)
  {
    IBoardOfDirectors boardOfDirectors = IBoardOfDirectors(boardOfDirectorsContractAddress);
    return boardOfDirectors.getBoardOfDirectors();
  }

  modifier onlyMember() {
    if (!IBoardOfDirectors(boardOfDirectorsContractAddress).isMember(msg.sender)) {
      revert OnlyBoardMember();
    }
    _;
  }

  modifier boardOfDirectorsContractExists() {
    if (boardOfDirectorsContractAddress == address(0)) {
      revert BoardOfDirectorAddressNotSet();
    }
    _;
  }
}
