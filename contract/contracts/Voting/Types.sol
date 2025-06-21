// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Types {
    enum TieBreakOption {
        RANDOM_SELECTION,
        RUNOFF_ELECTION,
        FOUNDER_CHOICE,
        INCREASE_WINNER_COUNT
    }

    struct DirectiveVotes {
        uint256 yes;
        uint256 no;
        uint256 abstain;
    }

    struct Candidate {
        address candidateAddress;
        uint256 votes;
    }

    struct Member {
        bool isEligible;
        bool isVoted;
        address memberAddress;
    }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        address draftedBy;
        bool isElection;
        bool isActive;
        uint256 winnerCount;
        DirectiveVotes votes;
        Candidate[] candidates;
        Member[] voters;
        bool hasTie;
        address[] tiedCandidates;
        TieBreakOption selectedTieBreakOption;
        uint256 startDate;
        uint256 endDate;
    }
}
