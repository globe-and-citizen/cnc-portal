// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Types.sol";
import {IBoardOfDirectors} from "../interfaces/IBoardOfDirectors.sol";
import "hardhat/console.sol";


import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';


contract Voting is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable  {
    mapping(uint256=>Types.Proposal) public proposalsById; 


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

    function initialize(address _sender) public initializer {
        __Ownable_init(_sender);
        __ReentrancyGuard_init();
        __Pausable_init();
  }

    function addProposal(
            string memory _title,
            string memory _description,
            bool _isElection,
            uint256 _winnerCount,
            address[] memory _voters,
            address[] memory _candidates
        ) public {
            require(bytes(_title).length > 0, "Title cannot be empty");

            Types.Proposal storage newProposal = proposalsById[proposalCount];
            newProposal.id = proposalCount;
            newProposal.title = _title;
            newProposal.description = _description;
            newProposal.draftedBy = msg.sender;
            newProposal.isElection = _isElection;
            newProposal.isActive = true;
            newProposal.winnerCount = _winnerCount;

            for (uint256 i = 0; i < _voters.length; i++) {
                Types.Member memory voter = Types.Member({isEligible:true, isVoted: false, memberAddress:_voters[i]});
                newProposal.voters.push(voter);
            }
            if(_isElection){
                require(_candidates.length > 0, "Candidates cannot be empty");
                for (uint256 i = 0; i < _candidates.length; i++) {
                        Types.Candidate memory candidate = Types.Candidate({candidateAddress:_candidates[i], votes:0});
                        newProposal.candidates.push(candidate);
                    }
            }
        
            proposalsById[proposalCount] = newProposal;
            emit ProposalAdded(proposalCount, _title, _description);
            proposalCount++;
        }





    function voteDirective(uint256 proposalId, uint256 vote) public {
        require(proposalId < proposalCount, "Proposal does not exist");

        Types.Proposal storage proposal = proposalsById[proposalId];
        require(proposal.isActive, "Proposal is not active");

        Types.Member storage voter = findVoter(proposal, msg.sender);

        require(voter.isEligible, "You are not eligible to vote");
        require(!voter.isVoted, "You have already voted");

        recordDirectiveVote(proposal, vote);

        voter.isVoted = true;
        emit DirectiveVoted(msg.sender, proposalId, vote);
    }

    function voteElection( uint256 proposalId, address candidateAddress) public {
        require(proposalId < proposalCount, "Proposal does not exist");

        Types.Proposal storage proposal = proposalsById[proposalId];
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

    function concludeProposal(uint256 proposalId) public {
        require(proposalId < proposalCount, "Proposal does not exist");
        require(msg.sender == proposalsById[proposalId].draftedBy, "Only the founder can conclude the proposal");

        Types.Proposal storage proposal = proposalsById[proposalId];
        proposal.isActive = !proposal.isActive;

        if(proposal.isElection){
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
        }
        emit ProposalConcluded(proposalId, proposal.isActive);
    }

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
        }
        else if (option == Types.TieBreakOption.FOUNDER_CHOICE) {
            // The founder will need to call selectWinner to choose the winner
            return;
        }
        else if (option == Types.TieBreakOption.RUNOFF_ELECTION) {
            // Create a new election with only the tied candidates
            string memory newTitle = string(abi.encodePacked("Runoff: ", proposal.title));
            addProposal(
                newTitle,
                proposal.description,
                true,
                proposal.winnerCount,
                _getVoterAddresses(proposal),
                proposal.tiedCandidates
            );
            emit RunoffElectionStarted(proposalCount - 1, proposal.tiedCandidates);
            proposal.hasTie = false;
        }
    }

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
    }

    function _getVoterAddresses(Types.Proposal storage proposal) internal view returns (address[] memory) {
        address[] memory voterAddresses = new address[](proposal.voters.length);
        for (uint256 i = 0; i < proposal.voters.length; i++) {
            voterAddresses[i] = proposal.voters[i].memberAddress;
        }
        return voterAddresses;
    }

    function findVoter(Types.Proposal storage proposal, address voterAddress) internal view returns (Types.Member storage) {
        for (uint256 i = 0; i < proposal.voters.length; i++) {
            if (proposal.voters[i].memberAddress == voterAddress) {
                return proposal.voters[i];
            }
        }
        revert("You are not registered to vote in this proposal");
    }
    function getProposalById(uint256 proposalId) public view returns (Types.Proposal memory) {
    require(proposalId < proposalCount, "Proposal does not exist");
    return proposalsById[proposalId];
}

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

    function setBoardOfDirectorsContractAddress(address _boardOfDirectorsContractAddress) public  {
        boardOfDirectorsContractAddress = _boardOfDirectorsContractAddress;
    }
    function setBoardOfDirectors(address[] memory _boardOfDirectors) public onlyOwner {
        IBoardOfDirectors(boardOfDirectorsContractAddress).setBoardOfDirectors(_boardOfDirectors);
    }
     function pause() external onlyOwner {
        _pause();
    }

  function unpause() external onlyOwner {
        _unpause();
    }
}
