// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Types {
    struct DirectiveVotes {
        uint256 yes;
        uint256 no;
        uint256 abstain;
    }

    struct Candidate {
        string name;
        address candidateAddress;
        uint256 votes;
    }

    struct Member {
        string name;
        bool isEligible;
        bool isVoted;
        address memberAddress;
    }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        string draftedBy;
        bool isElection;
        bool isActive;
        uint256 teamId;
        DirectiveVotes votes;
        Candidate[] candidates;
        Member[] voters;
    }
}
