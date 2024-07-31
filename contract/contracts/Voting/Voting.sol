// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Types.sol";
import "hardhat/console.sol";

contract Voting {
    mapping(uint256 => Types.Proposal[]) public proposalsByTeam; // team id => proposal array
    uint256 public proposalCount;

    event ProposalAdded(uint256 indexed proposalId, string title, string description);
    event DirectiveVoted(address indexed voter, uint256 indexed proposalId, uint256 vote);
    event ElectionVoted(address indexed voter, uint256 indexed proposalId, address indexed candidateAddress);
    event ProposalConcluded(uint256 indexed proposalId, bool isActive);

    function addProposal(Types.Proposal calldata _proposal) public {
        require(_proposal.teamId > 0, "Invalid teamId");
        require(bytes(_proposal.title).length > 0, "Title cannot be empty");

        Types.Proposal storage newProposal = proposalsByTeam[_proposal.teamId].push();
        
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

        emit ProposalAdded(proposalCount, _proposal.title, _proposal.description);
        proposalCount++;
    }

    function getProposals(uint256 teamId) view public returns (Types.Proposal[] memory) {
        return proposalsByTeam[teamId];
    }

    function voteDirective(uint256 teamId,uint256 proposalId, uint256 vote) public {
        require(proposalId < proposalCount, "Proposal does not exist");

        Types.Proposal storage proposal = getProposalById(teamId, proposalId);
        require(proposal.isActive, "Proposal is not active");

        Types.Member storage voter = findVoter(proposal, msg.sender);

        require(voter.isEligible, "You are not eligible to vote");
        require(!voter.isVoted, "You have already voted");

        recordDirectiveVote(proposal, vote);

        voter.isVoted = true;
        emit DirectiveVoted(msg.sender, proposalId, vote);
    }

    function voteElection(uint256 teamId, uint256 proposalId, address candidateAddress) public {
        require(proposalId < proposalCount, "Proposal does not exist");

        Types.Proposal storage proposal = getProposalById(teamId, proposalId);
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

    function concludeProposal(uint256 teamId,uint256 proposalId) public {
        require(proposalId < proposalCount, "Proposal does not exist");

        Types.Proposal storage proposal = getProposalById(teamId, proposalId);
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
    function getProposalById(uint256 teamId, uint256 proposalId) internal view returns (Types.Proposal storage) {
        Types.Proposal[] storage proposals = proposalsByTeam[teamId];
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].id == proposalId) {
                return proposals[i];
            }
        }
        revert("Proposal does not exist");
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
}
