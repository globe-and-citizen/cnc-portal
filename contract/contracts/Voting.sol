// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import "./Types.sol";

contract Voting is OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    mapping(address => Types.Member) public members;
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
    }
}


}
