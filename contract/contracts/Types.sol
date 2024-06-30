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
        string id;
        string name;
        string teamId;
        bool isVoted;
    }   
    struct Proposal{
        string title;
        string description;
        string draftedBy;
        bool isElection;
        DirectiveVotes votes;
        Candidate[] candidates;
        }
}