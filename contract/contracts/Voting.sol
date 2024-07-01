// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import "./Types.sol";

contract Voting is OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    mapping(address => Types.Member) public members;
    address[] public memberAddresses;

    mapping(uint256 id => Types.Proposal proposal) public proposals;
    uint256 public proposalCount;

   function initialize(Types.MemberInput[] memory inputs) public initializer {
    __Ownable_init(msg.sender);

    for (uint256 i = 0; i < inputs.length; i++) {
        members[inputs[i].memberAddress] = Types.Member({
            name: inputs[i].name,
            teamId: inputs[i].teamId,
            isEligible: true,
            isVoted: false
        });
        memberAddresses.push(inputs[i].memberAddress);
    }
    }
     function getElectoralRoll() public view returns (Types.Member[] memory) {
        Types.Member[] memory _members = new Types.Member[](memberAddresses.length);
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            _members[i] = members[memberAddresses[i]];
        }
        return _members;
    }
    function addMembers(Types.MemberInput[] memory inputs) public onlyOwner {
        for (uint256 i = 0; i < inputs.length; i++) {
            members[inputs[i].memberAddress] = Types.Member({
                name: inputs[i].name,
                teamId: inputs[i].teamId,
                isEligible: true,
                isVoted: false
            });
            memberAddresses.push(inputs[i].memberAddress);
        }
    }
    function addProposal(Types.Proposal memory _proposal) public onlyOwner {
        proposals[proposalCount] = _proposal;
        proposalCount++;
    }
    function getProposals() public view returns (Types.Proposal[] memory) {
        Types.Proposal[] memory _proposals = new Types.Proposal[](proposalCount);
        for (uint256 i = 0; i < proposalCount; i++) {
            _proposals[i] = proposals[i];
        }
        return _proposals;
    }
    function voteProposal(uint256 proposalId, uint256 vote) public {
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
    }
    function voteElection(uint256 proposalId, uint256 candidateId) public {
        require(members[msg.sender].isEligible, "You are not eligible to vote");
        require(!members[msg.sender].isVoted, "You have already voted");
        
        proposals[proposalId].candidates[candidateId].votes++;
        members[msg.sender].isVoted = true;
    }


}
