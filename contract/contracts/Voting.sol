// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import "./Types.sol";

contract Voting is OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    mapping(address => Types.Member) public members;
    address[] public memberAddresses;

    mapping(uint256 => Types.Proposal) public proposals;
    uint256 public proposalCount;

    event MemberAdded(address indexed memberAddress, string name, uint256 teamId);
    event ProposalAdded(uint256 indexed proposalId, string title, string description);
    event Voted(address indexed voter, uint256 indexed proposalId, uint256 vote);
    event ElectionVoted(address indexed voter, uint256 indexed proposalId, uint256 indexed candidateId);

    function initialize(Types.MemberInput[] memory inputs) public initializer {
        __Ownable_init(msg.sender);
        addMembers(inputs);
    }

    function getElectoralRoll() public view returns (Types.Member[] memory) {
        Types.Member[] memory _members = new Types.Member[](memberAddresses.length);
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            _members[i] = members[memberAddresses[i]];
        }
        return _members;
    }

    function addMembers(Types.MemberInput[] memory inputs) public onlyOwner whenNotPaused  {
        for (uint256 i = 0; i < inputs.length; i++) {
            members[inputs[i].memberAddress] = Types.Member({
                name: inputs[i].name,
                teamId: inputs[i].teamId,
                isEligible: true,
                isVoted: false
            });
            memberAddresses.push(inputs[i].memberAddress);
            emit MemberAdded(inputs[i].memberAddress, inputs[i].name, inputs[i].teamId);
        }
    }

   function addProposal(Types.Proposal memory _proposal) public onlyOwner whenNotPaused {
        Types.Proposal storage newProposal = proposals[proposalCount];
        newProposal.description = _proposal.description;
        newProposal.votes = _proposal.votes;

        for (uint256 i = 0; i < _proposal.candidates.length; i++) {
            newProposal.candidates.push(_proposal.candidates[i]);
        }

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
        require(members[msg.sender].isEligible, "You are not eligible to vote");
        require(!members[msg.sender].isVoted, "You have already voted");
        require(proposalId < proposalCount, "Proposal does not exist");

        if (vote == 0) {
            proposals[proposalId].votes.no++;
        } else if (vote == 1) {
            proposals[proposalId].votes.yes++;
        } else if (vote == 2) {
            proposals[proposalId].votes.abstain++;
        } else {
            revert("Invalid vote");
        }

        members[msg.sender].isVoted = true;
        emit Voted(msg.sender, proposalId, vote);
    }

    function voteElection(uint256 proposalId, uint256 candidateId) public whenNotPaused {
        require(members[msg.sender].isEligible, "You are not eligible to vote");
        require(!members[msg.sender].isVoted, "You have already voted");
        require(proposalId < proposalCount, "Proposal does not exist");
        require(candidateId < proposals[proposalId].candidates.length, "Candidate does not exist");

        proposals[proposalId].candidates[candidateId].votes++;
        members[msg.sender].isVoted = true;

        emit ElectionVoted(msg.sender, proposalId, candidateId);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
