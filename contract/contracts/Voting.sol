// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';

contract Voting is OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    struct ProposalVoteCount {
        uint256 yes;
        uint256 no;
        uint256 abstain;
    }

    struct Candidate {
        string name;
        uint256 votes;
    }

    enum ProposalType { Directive, Election }

    struct Proposal {
        string id;
        string title;
        string description;
        string teamId;
        string draftedBy;
        ProposalType proposalType;
        mapping(address => bool) voted;
        ProposalVoteCount votesForProposals;
        mapping(address => Candidate) candidate;
    }
    mapping(uint256 id => Proposal proposal) public proposals
    uint256 public proposalCount;

    function initialize() public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
    }

}
