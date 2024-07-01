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
    struct Member{
        string name;
        bool isEligible;
        bool isVoted;
        address memberAddress;
    }   
    struct Proposal{
        string title;
        string description;
        string draftedBy;
        bool isElection;
        bool isActive;
        DirectiveVotes votes;
        Candidate[] candidates;
        Member[] voters;
        }
    struct MemberInput {
        address memberAddress;
        string name;
        uint256 teamId;
        }

}