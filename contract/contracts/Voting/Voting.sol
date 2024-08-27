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
    address public boardOfDirectorsAddress;

    event ProposalAdded(uint256 indexed proposalId, string title, string description);
    event DirectiveVoted(address indexed voter, uint256 indexed proposalId, uint256 vote);
    event ElectionVoted(address indexed voter, uint256 indexed proposalId, address indexed candidateAddress);
    event ProposalConcluded(uint256 indexed proposalId, bool isActive);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
  }

    function addProposal(Types.Proposal calldata _proposal) public {
        require(bytes(_proposal.title).length > 0, "Title cannot be empty");

        Types.Proposal storage newProposal = proposalsById[proposalCount];
        
        newProposal.id = proposalCount;
        newProposal.title = _proposal.title;
        newProposal.description = _proposal.description;
        newProposal.draftedBy = _proposal.draftedBy;
        newProposal.isElection = _proposal.isElection;
        newProposal.isActive = _proposal.isActive;
        newProposal.teamId = _proposal.teamId;

        for (uint256 i = 0; i < _proposal.candidates.length; i++) {
            newProposal.candidates.push(_proposal.candidates[i]);
        }

        for (uint256 i = 0; i < _proposal.voters.length; i++) {
            newProposal.voters.push(_proposal.voters[i]);
        }

        newProposal.votes = _proposal.votes;

        proposalsById[proposalCount] = newProposal;

        emit ProposalAdded(proposalCount, _proposal.title, _proposal.description);
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

        Types.Proposal storage proposal = proposalsById[proposalId];
        proposal.isActive = !proposal.isActive;

        emit ProposalConcluded(proposalId, proposal.isActive);
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

    function setBoardOfDirectorsAddress(address _boardOfDirectorsAddress) public onlyOwner {
        boardOfDirectorsAddress = _boardOfDirectorsAddress;
    }

    function setBoardOfDirectors(address[] memory _boardOfDirectors) public onlyOwner {
        IBoardOfDirectors(boardOfDirectorsAddress).setBoardOfDirectors(_boardOfDirectors);
    }
}
