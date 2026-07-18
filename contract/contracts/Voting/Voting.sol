// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IBoardOfDirectors} from "../interfaces/IBoardOfDirectors.sol";
import {IOfficer} from "../interfaces/IOfficer.sol";
import {Types} from "./Types.sol";

/// @title Voting Contract for Decentralized Governance
/// @notice This contract manages proposals, elections, and voting processes
/// @dev Implements upgradeable patterns with OpenZeppelin contracts
contract Voting is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  mapping(uint256 proposalId => Types.Proposal proposal) private s_proposalsById;

  uint256 private s_proposalCount;
  address private s_officerAddress;

  event ProposalAdded(uint256 indexed proposalId, string title, string description);
  event DirectiveVoted(address indexed voter, uint256 indexed proposalId, uint256 vote);
  event ElectionVoted(
    address indexed voter,
    uint256 indexed proposalId,
    address indexed candidateAddress
  );
  event ProposalConcluded(uint256 indexed proposalId, bool isActive);
  event BoardOfDirectorsSet(address[] boardOfDirectors);
  event TieDetected(uint256 indexed proposalId, address[] tiedCandidates);
  event TieBreakOptionSelected(uint256 indexed proposalId, Types.TieBreakOption option);
  event RunoffElectionStarted(uint256 indexed proposalId, address[] candidates);

  /// @dev The caller (msg.sender) was the zero address when initializing.
  error Voting__ZeroSender();
  /// @dev A required string argument was empty.
  error Voting__EmptyTitle();
  /// @dev Election proposals require at least one candidate.
  error Voting__NoCandidates();
  /// @dev The proposal id does not exist.
  /// @param proposalId The non-existent id.
  error Voting__ProposalNotFound(uint256 proposalId);
  /// @dev The proposal is no longer active.
  error Voting__ProposalNotActive();
  /// @dev The caller is not registered to vote on this proposal.
  /// @param voter The caller address.
  error Voting__VoterNotRegistered(address voter);
  /// @dev The caller is not eligible to vote on this proposal.
  error Voting__VoterNotEligible();
  /// @dev The caller has already voted on this proposal.
  error Voting__VoterAlreadyVoted();
  /// @dev The specified candidate was not declared on this proposal.
  error Voting__CandidateNotFound();
  /// @dev Only the proposal creator (founder) can perform this action.
  error Voting__OnlyFounder();
  /// @dev No tie exists on this proposal.
  error Voting__NoTieToResolve();
  /// @dev The chosen tie-break option requires a different flow.
  error Voting__WrongTieBreakOption();
  /// @dev The selected winner was not in the tied candidates list.
  error Voting__InvalidTieWinner();
  /// @dev The directive vote value was not 0/1/2.
  /// @param vote The invalid vote value.
  error Voting__InvalidVote(uint256 vote);
  /// @dev The officer contract address has not been configured.
  error Voting__OfficerAddressNotSet();
  /// @dev The BoardOfDirectors contract could not be located via the Officer.
  error Voting__BoardOfDirectorsNotFound();

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /// @notice Pauses the contract
  /// @dev Only callable by contract owner
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpauses the contract
  /// @dev Only callable by contract owner
  function unpause() external onlyOwner {
    _unpause();
  }

  /// @notice Initializes the contract
  /// @param sender Address that will be set as the owner
  /// @dev This is the initialization function for the upgradeable contract pattern
  function initialize(address sender) public initializer {
    __Ownable_init(sender);
    __ReentrancyGuard_init();
    __Pausable_init();

    if (msg.sender == address(0)) revert Voting__ZeroSender();
    s_officerAddress = msg.sender;
  }

  /// @notice Creates a new proposal
  /// @param title Title of the proposal
  /// @param description Detailed description of the proposal
  /// @param isElection Whether this is an election proposal
  /// @param winnerCount Number of winners to be selected (for elections)
  /// @param voters Array of addresses eligible to vote
  /// @param candidates Array of candidate addresses (for elections)
  /// @dev For elections, candidates must not be empty
  function addProposal(
    string memory title,
    string memory description,
    bool isElection,
    uint256 winnerCount,
    address[] memory voters,
    address[] memory candidates
  ) public {
    if (bytes(title).length == 0) revert Voting__EmptyTitle();

    Types.Proposal storage newProposal = s_proposalsById[s_proposalCount];
    newProposal.id = s_proposalCount;
    newProposal.title = title;
    newProposal.description = description;
    newProposal.draftedBy = msg.sender;
    newProposal.isElection = isElection;
    newProposal.isActive = true;
    newProposal.winnerCount = winnerCount;

    for (uint256 i = 0; i < voters.length; i++) {
      Types.Member memory voter = Types.Member({
        isEligible: true,
        isVoted: false,
        memberAddress: voters[i]
      });
      newProposal.voters.push(voter);
    }
    if (isElection) {
      if (candidates.length == 0) revert Voting__NoCandidates();
      for (uint256 i = 0; i < candidates.length; i++) {
        Types.Candidate memory candidate = Types.Candidate({
          candidateAddress: candidates[i],
          votes: 0
        });
        newProposal.candidates.push(candidate);
      }
    }

    s_proposalsById[s_proposalCount] = newProposal;
    emit ProposalAdded(s_proposalCount, title, description);
    s_proposalCount++;
  }

  /// @notice Allows a voter to vote on a directive proposal
  /// @param proposalId ID of the proposal
  /// @param vote 0 for No, 1 for Yes, 2 for Abstain
  /// @dev Requires voter to be eligible and not to have voted already
  function voteDirective(uint256 proposalId, uint256 vote) public {
    if (proposalId >= s_proposalCount) revert Voting__ProposalNotFound(proposalId);

    Types.Proposal storage proposal = s_proposalsById[proposalId];
    if (!proposal.isActive) revert Voting__ProposalNotActive();

    Types.Member storage voter = _findVoter(proposal, msg.sender);

    if (!voter.isEligible) revert Voting__VoterNotEligible();
    if (voter.isVoted) revert Voting__VoterAlreadyVoted();

    _recordDirectiveVote(proposal, vote);

    voter.isVoted = true;
    emit DirectiveVoted(msg.sender, proposalId, vote);
  }

  /// @notice Allows a voter to vote in an election
  /// @param proposalId ID of the election proposal
  /// @param candidateAddress Address of the candidate being voted for
  /// @dev Requires voter to be eligible and not to have voted already
  function voteElection(uint256 proposalId, address candidateAddress) public {
    if (proposalId >= s_proposalCount) revert Voting__ProposalNotFound(proposalId);

    Types.Proposal storage proposal = s_proposalsById[proposalId];
    if (!proposal.isActive) revert Voting__ProposalNotActive();

    Types.Member storage voter = _findVoter(proposal, msg.sender);

    if (!voter.isEligible) revert Voting__VoterNotEligible();
    if (voter.isVoted) revert Voting__VoterAlreadyVoted();

    bool candidateExists = false;
    for (uint256 i = 0; i < proposal.candidates.length; i++) {
      if (proposal.candidates[i].candidateAddress == candidateAddress) {
        proposal.candidates[i].votes++;
        candidateExists = true;
        break;
      }
    }

    if (!candidateExists) revert Voting__CandidateNotFound();
    voter.isVoted = true;
    emit ElectionVoted(msg.sender, proposalId, candidateAddress);
  }

  /// @notice Concludes a proposal and processes the results
  /// @param proposalId ID of the proposal to conclude
  /// @dev Only the proposal creator can conclude it. Handles tie detection for elections
  function concludeProposal(uint256 proposalId) public {
    if (proposalId >= s_proposalCount) revert Voting__ProposalNotFound(proposalId);
    if (msg.sender != s_proposalsById[proposalId].draftedBy) revert Voting__OnlyFounder();

    Types.Proposal storage proposal = s_proposalsById[proposalId];

    if (proposal.isElection) {
      uint256 winnerCount = proposal.winnerCount;
      Types.Candidate[] memory candidates = proposal.candidates;

      // Sort candidates by votes in descending order
      for (uint256 i = 0; i < candidates.length; i++) {
        for (uint256 j = i + 1; j < candidates.length; j++) {
          if (candidates[i].votes < candidates[j].votes) {
            Types.Candidate memory temp = candidates[i];
            candidates[i] = candidates[j];
            candidates[j] = temp;
          }
        }
      }

      // Check for ties at the winnerCount position
      if (winnerCount < candidates.length) {
        uint256 votesAtCutoff = candidates[winnerCount - 1].votes;
        uint256 tiedCount = 0;

        // Count how many candidates are tied at the cutoff
        for (uint256 i = 0; i < candidates.length; i++) {
          if (candidates[i].votes == votesAtCutoff) {
            tiedCount++;
          }
        }

        if (tiedCount > 1) {
          // Store tied candidates
          address[] memory tiedCandidates = new address[](tiedCount);
          uint256 tiedIndex = 0;
          for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].votes == votesAtCutoff) {
              tiedCandidates[tiedIndex] = candidates[i].candidateAddress;
              tiedIndex++;
            }
          }

          proposal.hasTie = true;
          proposal.tiedCandidates = tiedCandidates;
          emit TieDetected(proposalId, tiedCandidates);
          return;
        }
      }

      // If no tie or after tie is resolved, set the winners
      address[] memory winnerList = new address[](winnerCount);
      for (uint256 i = 0; i < winnerCount; i++) {
        winnerList[i] = candidates[i].candidateAddress;
      }
      address bodAddress = _getBoardOfDirectorsAddress();
      IBoardOfDirectors(bodAddress).setBoardOfDirectors(winnerList);
      emit BoardOfDirectorsSet(winnerList);
    }
    proposal.isActive = !proposal.isActive;

    emit ProposalConcluded(proposalId, proposal.isActive);
  }

  /// @notice Resolves a tie in an election using the specified method
  /// @param proposalId ID of the proposal with the tie
  /// @param option The chosen method to break the tie
  /// @dev Only the proposal creator can resolve ties
  function resolveTie(uint256 proposalId, Types.TieBreakOption option) public {
    if (proposalId >= s_proposalCount) revert Voting__ProposalNotFound(proposalId);
    Types.Proposal storage proposal = s_proposalsById[proposalId];
    if (msg.sender != proposal.draftedBy) revert Voting__OnlyFounder();
    if (!proposal.hasTie) revert Voting__NoTieToResolve();

    proposal.selectedTieBreakOption = option;
    emit TieBreakOptionSelected(proposalId, option);

    if (option == Types.TieBreakOption.RANDOM_SELECTION) {
      // Use block hash for randomness
      uint256 randomIndex = uint256(blockhash(block.number - 1)) % proposal.tiedCandidates.length;
      address selectedWinner = proposal.tiedCandidates[randomIndex];

      // Replace the last winner with the randomly selected one
      address[] memory winnerList = new address[](proposal.winnerCount);
      for (uint256 i = 0; i < proposal.winnerCount - 1; i++) {
        winnerList[i] = proposal.candidates[i].candidateAddress;
      }
      winnerList[proposal.winnerCount - 1] = selectedWinner;

      address bodAddress = _getBoardOfDirectorsAddress();
      IBoardOfDirectors(bodAddress).setBoardOfDirectors(winnerList);
      emit BoardOfDirectorsSet(winnerList);
      proposal.hasTie = false;
      proposal.isActive = !proposal.isActive;
    } else if (option == Types.TieBreakOption.INCREASE_WINNER_COUNT) {
      proposal.winnerCount += 1;
      address[] memory winnerList = new address[](proposal.winnerCount);
      for (uint256 i = 0; i < proposal.winnerCount; i++) {
        winnerList[i] = proposal.candidates[i].candidateAddress;
      }

      address bodAddress2 = _getBoardOfDirectorsAddress();
      IBoardOfDirectors(bodAddress2).setBoardOfDirectors(winnerList);
      emit BoardOfDirectorsSet(winnerList);
      proposal.hasTie = false;
      proposal.isActive = !proposal.isActive;
    } else if (option == Types.TieBreakOption.FOUNDER_CHOICE) {
      // The founder will need to call selectWinner to choose the winner
      return;
    } else if (option == Types.TieBreakOption.RUNOFF_ELECTION) {
      // Create a new election with only the tied candidates
      string memory newTitle = string(abi.encodePacked("Runoff: ", proposal.title));
      addProposal({
        title: newTitle,
        description: proposal.description,
        isElection: true,
        winnerCount: proposal.winnerCount,
        voters: _getVoterAddresses(proposal),
        candidates: proposal.tiedCandidates
      });
      emit RunoffElectionStarted(s_proposalCount - 1, proposal.tiedCandidates);
      proposal.hasTie = false;
      proposal.isActive = !proposal.isActive;
    }
  }

  /// @notice Allows the founder to select a winner in case of a tie
  /// @param proposalId ID of the proposal
  /// @param winner Address of the chosen winner
  /// @dev Only usable when FOUNDER_CHOICE was selected as tie break option
  function selectWinner(uint256 proposalId, address winner) public {
    if (proposalId >= s_proposalCount) revert Voting__ProposalNotFound(proposalId);
    Types.Proposal storage proposal = s_proposalsById[proposalId];
    if (msg.sender != proposal.draftedBy) revert Voting__OnlyFounder();
    if (!proposal.hasTie) revert Voting__NoTieToResolve();
    if (proposal.selectedTieBreakOption != Types.TieBreakOption.FOUNDER_CHOICE)
      revert Voting__WrongTieBreakOption();

    bool isValidChoice = false;
    for (uint256 i = 0; i < proposal.tiedCandidates.length; i++) {
      if (proposal.tiedCandidates[i] == winner) {
        isValidChoice = true;
        break;
      }
    }
    if (!isValidChoice) revert Voting__InvalidTieWinner();

    address[] memory winnerList = new address[](proposal.winnerCount);
    for (uint256 i = 0; i < proposal.winnerCount - 1; i++) {
      winnerList[i] = proposal.candidates[i].candidateAddress;
    }
    winnerList[proposal.winnerCount - 1] = winner;

    address bodAddress = _getBoardOfDirectorsAddress();
    IBoardOfDirectors(bodAddress).setBoardOfDirectors(winnerList);
    emit BoardOfDirectorsSet(winnerList);
    proposal.hasTie = false;
    proposal.isActive = !proposal.isActive;
  }

  /// @notice Sets the Board of Directors members
  /// @param boardMembers Array of addresses for the new board members
  /// @dev Only callable by contract owner
  function setBoardOfDirectors(address[] memory boardMembers) public onlyOwner {
    address bodAddress = _getBoardOfDirectorsAddress();
    IBoardOfDirectors(bodAddress).setBoardOfDirectors(boardMembers);
  }

  /// @notice Retrieves a proposal by its ID
  /// @param proposalId The ID of the proposal to retrieve
  /// @return The complete proposal data
  function getProposalById(uint256 proposalId) public view returns (Types.Proposal memory) {
    if (proposalId >= s_proposalCount) revert Voting__ProposalNotFound(proposalId);
    return s_proposalsById[proposalId];
  }

  /// @notice Returns the stored proposal for a given id.
  /// @param proposalId The id of the proposal.
  /// @return The complete proposal data.
  function getProposalsById(uint256 proposalId) external view returns (Types.Proposal memory) {
    return s_proposalsById[proposalId];
  }

  /// @notice Returns the number of proposals created so far.
  function getProposalCount() external view returns (uint256) {
    return s_proposalCount;
  }

  /// @notice Returns the address of the Officer contract used to locate BoardOfDirectors.
  function getOfficerAddress() external view returns (address) {
    return s_officerAddress;
  }

  /// @notice Records a vote for a directive proposal
  /// @param proposal The proposal to record the vote for
  /// @param vote The vote value (0=No, 1=Yes, 2=Abstain)
  /// @dev Internal function to update vote counts
  function _recordDirectiveVote(Types.Proposal storage proposal, uint256 vote) internal {
    if (vote == 0) {
      proposal.votes.no++;
    } else if (vote == 1) {
      proposal.votes.yes++;
    } else if (vote == 2) {
      proposal.votes.abstain++;
    } else {
      revert Voting__InvalidVote(vote);
    }
  }

  /// @notice Internal function to get all voter addresses from a proposal
  /// @param proposal The proposal to extract voters from
  /// @return Array of voter addresses
  function _getVoterAddresses(
    Types.Proposal storage proposal
  ) internal view returns (address[] memory) {
    address[] memory voterAddresses = new address[](proposal.voters.length);
    for (uint256 i = 0; i < proposal.voters.length; i++) {
      voterAddresses[i] = proposal.voters[i].memberAddress;
    }
    return voterAddresses;
  }

  /// @notice Finds a voter in a proposal's voter list
  /// @param proposal The proposal to search in
  /// @param voterAddress The address of the voter to find
  /// @return The found voter's data
  /// @dev Reverts if voter is not found
  function _findVoter(
    Types.Proposal storage proposal,
    address voterAddress
  ) internal view returns (Types.Member storage) {
    for (uint256 i = 0; i < proposal.voters.length; i++) {
      if (proposal.voters[i].memberAddress == voterAddress) {
        return proposal.voters[i];
      }
    }
    revert Voting__VoterNotRegistered(voterAddress);
  }

  /**
   * @dev Internal helper to get BoardOfDirectors contract address from Officer
   * @return Address of the BoardOfDirectors contract
   */
  function _getBoardOfDirectorsAddress() internal view returns (address) {
    if (s_officerAddress == address(0)) revert Voting__OfficerAddressNotSet();
    address bodAddress = IOfficer(s_officerAddress).findDeployedContract("BoardOfDirectors");
    if (bodAddress == address(0)) revert Voting__BoardOfDirectorsNotFound();
    return bodAddress;
  }
}
