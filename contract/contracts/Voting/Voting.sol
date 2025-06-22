// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Types.sol";
import {IBoardOfDirectors} from "../interfaces/IBoardOfDirectors.sol";
import "hardhat/console.sol";

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';

/// @title Voting Contract for Decentralized Governance
/// @notice This contract manages proposals, elections, and voting processes
/// @dev Implements upgradeable patterns with OpenZeppelin contracts
contract Voting is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable  {
    mapping(uint256=>Types.Proposal) public proposalsById; 
    mapping(uint256=>uint256) public totalVotesByProposalId;


    uint256 public proposalCount;
    address public boardOfDirectorsContractAddress;

    event ProposalAdded(uint256 indexed proposalId, string title, string description);
    event DirectiveVoted(address indexed voter, uint256 indexed proposalId, uint256 vote);
    event ElectionVoted(address indexed voter, uint256 indexed proposalId, address indexed candidateAddress);
    event ProposalConcluded(uint256 indexed proposalId, bool isActive);
    event BoardOfDirectorsSet(address[] boardOfDirectors);
    event TieDetected(uint256 indexed proposalId, address[] tiedCandidates);
    event TieBreakOptionSelected(uint256 indexed proposalId, Types.TieBreakOption option);
    event RunoffElectionStarted(uint256 indexed proposalId, address[] candidates);

    /// @notice Initializes the contract
    /// @param _sender Address that will be set as the owner
    /// @dev This is the initialization function for the upgradeable contract pattern
    function initialize(address _sender) public initializer {
        __Ownable_init(_sender);
        __ReentrancyGuard_init();
        __Pausable_init();
  }

    /// @notice Creates a new proposal
    /// @param _title Title of the proposal
    /// @param _description Detailed description of the proposal
    /// @param _isElection Whether this is an election proposal
    /// @param _winnerCount Number of winners to be selected (for elections)
    /// @param _voters Array of addresses eligible to vote
    /// @param _candidates Array of candidate addresses (for elections)
    /// @param _startDate Start date of the proposal
    /// @param _endDate End date of the proposal
    /// @dev For elections, _candidates must not be empty
    function addProposal(
            string memory _title,
            string memory _description,
            bool _isElection,
            uint256 _winnerCount,
            address[] memory _voters,
            address[] memory _candidates,
            uint256 _startDate,
            uint256 _endDate
        ) public {
            require(bytes(_title).length > 0, "Title cannot be empty");
            address[] memory boardOfDirectors = IBoardOfDirectors(boardOfDirectorsContractAddress).getBoardOfDirectors();
            if (_isElection) {
                require(owner() == msg.sender, "Only owner can create BoD elections");
            } else {
                require(boardOfDirectors.length > 0, "Board of Directors must be set before creating proposals");
            }

            Types.Proposal storage newProposal = proposalsById[proposalCount];
            newProposal.id = proposalCount;
            newProposal.title = _title;
            newProposal.description = _description;
            newProposal.draftedBy = msg.sender;
            newProposal.isElection = _isElection;
            newProposal.isActive = true;
            newProposal.winnerCount = _winnerCount;
            newProposal.startDate = _startDate;
            newProposal.endDate = _endDate;

            // For board-only proposals, automatically set voters from the Board of Directors
            if (!_isElection && boardOfDirectorsContractAddress != address(0)) {
                for (uint256 i = 0; i < boardOfDirectors.length; i++) {
                    Types.Member memory voter = Types.Member({
                        isEligible: true, 
                        isVoted: false, 
                        memberAddress: boardOfDirectors[i]
                    });
                    newProposal.voters.push(voter);
                }
            } else {
                // Use provided voters for elections
                for (uint256 i = 0; i < _voters.length; i++) {
                    Types.Member memory voter = Types.Member({
                        isEligible: true, 
                        isVoted: false, 
                        memberAddress: _voters[i]
                    });
                    newProposal.voters.push(voter);
                }
            }

            if(_isElection){
                require(_candidates.length > 0, "Candidates cannot be empty");
                require(_candidates.length % 2 == 1, "Number of candidates must be odd");
                for (uint256 i = 0; i < _candidates.length; i++) {
                        Types.Candidate memory candidate = Types.Candidate({candidateAddress:_candidates[i], votes:0});
                        newProposal.candidates.push(candidate);
                    }
            }
        
            proposalsById[proposalCount] = newProposal;
            emit ProposalAdded(proposalCount, _title, _description);
            proposalCount++;
        }





    /// @notice Allows a voter to vote on a directive proposal
    /// @param proposalId ID of the proposal
    /// @param vote 0 for No, 1 for Yes, 2 for Abstain
    /// @dev Requires voter to be eligible and not to have voted already
    function voteDirective(uint256 proposalId, uint256 vote) public {
        require(proposalId < proposalCount, "Proposal does not exist");

        Types.Proposal storage proposal = proposalsById[proposalId];
        require(proposal.endDate > block.timestamp, "Voting period has ended");
        require(proposal.startDate <= block.timestamp, "Voting period has not started yet");
        require(proposal.isActive, "Proposal is not active");

        Types.Member storage voter = findVoter(proposal, msg.sender);

        require(voter.isEligible, "You are not eligible to vote");
        require(!voter.isVoted, "You have already voted");

        recordDirectiveVote(proposal, vote);

        voter.isVoted = true;
        totalVotesByProposalId[proposalId] += 1;

        emit DirectiveVoted(msg.sender, proposalId, vote);

        // Check if all voters have voted
        if (totalVotesByProposalId[proposalId] == proposal.voters.length) {
            concludeProposal(proposalId);
        }
    }

    /// @notice Allows a voter to vote in an election
    /// @param proposalId ID of the election proposal
    /// @param candidateAddress Address of the candidate being voted for
    /// @dev Requires voter to be eligible and not to have voted already
    function voteElection( uint256 proposalId, address candidateAddress) public {
        require(proposalId < proposalCount, "Proposal does not exist");

        Types.Proposal storage proposal = proposalsById[proposalId];
        require(proposal.endDate > block.timestamp, "Voting period has ended");
        require(proposal.startDate <= block.timestamp, "Voting period has not started yet");
        require(proposal.isActive, "Proposal is not active");

        Types.Member storage voter = findVoter(proposal, msg.sender);

        require(voter.isEligible, "You are not eligible to vote");
        require(!voter.isVoted, "You have already voted");

        bool candidateExists = false;
        for (uint256 i = 0; i < proposal.candidates.length; i++) {
            if (proposal.candidates[i].candidateAddress == candidateAddress) {
                proposal.candidates[i].votes++;
                candidateExists = true;
                break;
            }
        }

        require(candidateExists, "Candidate does not exist");
        voter.isVoted = true;
        emit ElectionVoted(msg.sender, proposalId, candidateAddress);
    }

    /// @notice Concludes a proposal and processes the results
    /// @param proposalId ID of the proposal to conclude
    /// @dev Only the proposal creator can conclude it. Handles tie detection for elections
    function concludeProposal(uint256 proposalId) public {
        require(proposalId < proposalCount, "Proposal does not exist");

        Types.Proposal storage proposal = proposalsById[proposalId];

        if(proposal.isElection){
            require(owner() == msg.sender, "Only owner can conclude elections");
            require(proposal.endDate <= block.timestamp, "Voting period has not ended yet");

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
            IBoardOfDirectors(boardOfDirectorsContractAddress).setBoardOfDirectors(winnerList);
            emit BoardOfDirectorsSet(winnerList);
        } else {
            require(
                owner() == msg.sender || isBoardMember(msg.sender),
                'Only the founder or board member can conclude this proposal'
            );
        }
        proposal.isActive = !proposal.isActive;

        emit ProposalConcluded(proposalId, proposal.isActive);
    }

    /// @notice Resolves a tie in an election using the specified method
    /// @param proposalId ID of the proposal with the tie
    /// @param option The chosen method to break the tie
    /// @dev Only the proposal creator can resolve ties
    function resolveTie(uint256 proposalId, Types.TieBreakOption option) public {
        require(proposalId < proposalCount, "Proposal does not exist");
        Types.Proposal storage proposal = proposalsById[proposalId];
        require(msg.sender == proposal.draftedBy, "Only the founder can resolve ties");
        require(proposal.hasTie, "No tie to resolve");

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
            
            IBoardOfDirectors(boardOfDirectorsContractAddress).setBoardOfDirectors(winnerList);
            emit BoardOfDirectorsSet(winnerList);
            proposal.hasTie = false;
            proposal.isActive = !proposal.isActive;
        }
        else if (option == Types.TieBreakOption.INCREASE_WINNER_COUNT) {
            proposal.winnerCount += 1;
            address[] memory winnerList = new address[](proposal.winnerCount);
            for (uint256 i = 0; i < proposal.winnerCount; i++) {
                winnerList[i] = proposal.candidates[i].candidateAddress;
            }
            
            IBoardOfDirectors(boardOfDirectorsContractAddress).setBoardOfDirectors(winnerList);
            emit BoardOfDirectorsSet(winnerList);
            proposal.hasTie = false;
            proposal.isActive = !proposal.isActive;
        }
        else if (option == Types.TieBreakOption.FOUNDER_CHOICE) {
            // The founder will need to call selectWinner to choose the winner
            return;
        }
        // else if (option == Types.TieBreakOption.RUNOFF_ELECTION) {
        //     // Create a new election with only the tied candidates
        //     string memory newTitle = string(abi.encodePacked("Runoff: ", proposal.title));
        //     addProposal(
        //         newTitle,
        //         proposal.description,
        //         true,
        //         proposal.winnerCount,
        //         _getVoterAddresses(proposal),
        //         proposal.tiedCandidates,
        //         false,
        //     );
        //     emit RunoffElectionStarted(proposalCount - 1, proposal.tiedCandidates);
        //     proposal.hasTie = false;
        //     proposal.isActive = !proposal.isActive;
        // }
    }

    /// @notice Allows the founder to select a winner in case of a tie
    /// @param proposalId ID of the proposal
    /// @param winner Address of the chosen winner
    /// @dev Only usable when FOUNDER_CHOICE was selected as tie break option
    function selectWinner(uint256 proposalId, address winner) public {
        require(proposalId < proposalCount, "Proposal does not exist");
        Types.Proposal storage proposal = proposalsById[proposalId];
        require(msg.sender == proposal.draftedBy, "Only the founder can select winner");
        require(proposal.hasTie, "No tie to resolve");
        require(proposal.selectedTieBreakOption == Types.TieBreakOption.FOUNDER_CHOICE, "Tie break option must be FOUNDER_CHOICE");
        
        bool isValidChoice = false;
        for (uint256 i = 0; i < proposal.tiedCandidates.length; i++) {
            if (proposal.tiedCandidates[i] == winner) {
                isValidChoice = true;
                break;
            }
        }
        require(isValidChoice, "Selected winner must be one of the tied candidates");

        address[] memory winnerList = new address[](proposal.winnerCount);
        for (uint256 i = 0; i < proposal.winnerCount - 1; i++) {
            winnerList[i] = proposal.candidates[i].candidateAddress;
        }
        winnerList[proposal.winnerCount - 1] = winner;
        
        IBoardOfDirectors(boardOfDirectorsContractAddress).setBoardOfDirectors(winnerList);
        emit BoardOfDirectorsSet(winnerList);
        proposal.hasTie = false;
        proposal.isActive = !proposal.isActive;
    }

    /// @notice Finds a voter in a proposal's voter list
    /// @param proposal The proposal to search in
    /// @param voterAddress The address of the voter to find
    /// @return The found voter's data
    /// @dev Reverts if voter is not found
    function findVoter(Types.Proposal storage proposal, address voterAddress) internal view returns (Types.Member storage) {
        for (uint256 i = 0; i < proposal.voters.length; i++) {
            if (proposal.voters[i].memberAddress == voterAddress) {
                return proposal.voters[i];
            }
        }
        revert("You are not registered to vote in this proposal");
    }

    /// @notice Retrieves a proposal by its ID
    /// @param proposalId The ID of the proposal to retrieve
    /// @return The complete proposal data
    function getProposalById(uint256 proposalId) public view returns (Types.Proposal memory) {
    require(proposalId < proposalCount, "Proposal does not exist");
    return proposalsById[proposalId];
}

    /// @notice Records a vote for a directive proposal
    /// @param proposal The proposal to record the vote for
    /// @param vote The vote value (0=No, 1=Yes, 2=Abstain)
    /// @dev Internal function to update vote counts
    function recordDirectiveVote(Types.Proposal storage proposal, uint256 vote) internal {
        if (vote == 0) {
            proposal.votes.no++;
        } else if (vote == 1) {
            proposal.votes.yes++;
        } else if (vote == 2) {
            proposal.votes.abstain++;
        } else {
            revert("Invalid vote");
        }
    }

    /// @notice Check if msg.address is a member of the Board of Directors
    /// @param _address The address to check
    /// @return bool True if the address is a member, false otherwise
    function isBoardMember(address _address) public view returns (bool) {
        return IBoardOfDirectors(boardOfDirectorsContractAddress).isBoardMember(_address);
    }

    /// @notice Sets the address of the Board of Directors contract
    /// @param _boardOfDirectorsContractAddress The address of the BoD contract
    function setBoardOfDirectorsContractAddress(address _boardOfDirectorsContractAddress) public  {
        boardOfDirectorsContractAddress = _boardOfDirectorsContractAddress;
    }

    /// @notice Sets the Board of Directors members
    /// @param _boardOfDirectors Array of addresses for the new board members
    /// @dev Only callable by contract owner
    function setBoardOfDirectors(address[] memory _boardOfDirectors) public onlyOwner {
        IBoardOfDirectors(boardOfDirectorsContractAddress).setBoardOfDirectors(_boardOfDirectors);
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
}
