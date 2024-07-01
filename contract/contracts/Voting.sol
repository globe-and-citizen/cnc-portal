// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import "./Types.sol";

contract Voting is OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    mapping(uint256 => Types.Proposal) public proposals;
    uint256 public proposalCount;

    event ProposalAdded(uint256 indexed proposalId, string title, string description);
    event Voted(address indexed voter, uint256 indexed proposalId, uint256 vote);
    event ElectionVoted(address indexed voter, uint256 indexed proposalId, address indexed candidateAddress);
    event ProposalConcluded(uint256 indexed proposalId, Types.Proposal proposal);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

   function addProposal(Types.Proposal calldata _proposal) public onlyOwner whenNotPaused {
        proposals[proposalCount] = _proposal;
        emit ProposalAdded(proposalCount, _proposal.title,_proposal.description);
        proposalCount++;
    }

    function getProposals() public view returns (Types.Proposal[] memory) {
        Types.Proposal[] memory _proposals = new Types.Proposal[](proposalCount);
        for (uint256 i = 0; i < proposalCount; i++) {
            _proposals[i] = proposals[i];
        }
        return _proposals;
    }

    function voteProposal(uint256 proposalId, uint256 vote) public whenNotPaused {
        require(proposalId < proposalCount, "Proposal does not exist");
        require(proposals[proposalId].isActive, "Proposal is not active");

        Types.Proposal storage proposal = proposals[proposalId];
        Types.Member storage voter = findVoter(proposal, msg.sender);

        require(voter.isEligible, "You are not eligible to vote");
        require(!voter.isVoted, "You have already voted");

        recordVote(proposal, vote);

        voter.isVoted = true;
        emit Voted(msg.sender, proposalId, vote);
    }

    function voteElection(uint256 proposalId, address candidateAddress) public whenNotPaused {
        require(proposalId < proposalCount, "Proposal does not exist");
        require(proposals[proposalId].isActive, "Proposal is not active");
        
        Types.Proposal storage proposal = proposals[proposalId];
        Types.Member storage voter = findVoter(proposal, msg.sender);

        require(voter.isEligible, "You are not eligible to vote");
        require(!voter.isVoted, "You have already voted");

        for(uint256 i=0; i<proposal.candidates.length; i++){
            if(proposal.candidates[i].candidateAddress == candidateAddress){
                proposal.candidates[i].votes++;
                voter.isVoted = true;
                emit ElectionVoted(msg.sender, proposalId, candidateAddress);
                return;
            }
        }
        revert("Candidate does not exist");
    }

    function concludeProposal(uint256 proposalId) public onlyOwner whenNotPaused {
        require(proposalId < proposalCount, "Proposal does not exist");
        proposals[proposalId].isActive = !proposals[proposalId].isActive;
        emit ProposalConcluded(proposalId, proposals[proposalId]);
    }
    function findVoter(Types.Proposal storage proposal, address voterAddress) internal view returns (Types.Member storage) {
        for (uint256 i = 0; i < proposal.voters.length; i++) {
            if (proposal.voters[i].memberAddress == voterAddress) {
                return proposal.voters[i];
            }
        }
        revert("You are not registered to vote in this proposal");
    }

    function recordVote(Types.Proposal storage proposal, uint256 vote) internal {
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

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
