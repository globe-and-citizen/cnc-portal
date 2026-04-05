// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Types
 * @notice Shared data structures for the Voting contract.
 * @dev Groups the proposal, candidate, voter, and tie-break enums/structs in one place.
 */
library Types {
  /**
   * @dev Options the founder can use to resolve an election tie.
   */
  enum TieBreakOption {
    RANDOM_SELECTION,
    RUNOFF_ELECTION,
    FOUNDER_CHOICE,
    INCREASE_WINNER_COUNT
  }

  /**
   * @dev Vote tally for a directive proposal.
   * @param yes Number of yes votes.
   * @param no Number of no votes.
   * @param abstain Number of abstain votes.
   */
  struct DirectiveVotes {
    uint256 yes;
    uint256 no;
    uint256 abstain;
  }

  /**
   * @dev A candidate taking part in an election proposal.
   * @param candidateAddress Address of the candidate.
   * @param votes Number of votes accumulated by the candidate.
   */
  struct Candidate {
    address candidateAddress;
    uint256 votes;
  }

  /**
   * @dev An eligible voter on a proposal.
   * @param isEligible Whether the member is allowed to vote.
   * @param isVoted Whether the member has already cast their vote.
   * @param memberAddress Address of the voter.
   */
  struct Member {
    bool isEligible;
    bool isVoted;
    address memberAddress;
  }

  /**
   * @dev A proposal, which can be either a directive (yes/no/abstain) or an election.
   * @param id Identifier of the proposal.
   * @param title Proposal title.
   * @param description Proposal description.
   * @param draftedBy Address that created the proposal.
   * @param isElection True if this proposal is an election, false for a directive.
   * @param isActive Whether voting is currently open for this proposal.
   * @param winnerCount Number of election winners to select.
   * @param votes Aggregated directive votes (unused for elections).
   * @param candidates Election candidates (unused for directives).
   * @param voters List of voters eligible for this proposal.
   * @param hasTie True if the election concluded with a tie that needs resolving.
   * @param tiedCandidates Addresses of candidates tied at the cutoff seat.
   * @param selectedTieBreakOption Method chosen to break the tie, if any.
   */
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
  }
}
