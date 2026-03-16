# Contract: Voting

**Epic Goal:** Provide a unified voting contract for both directive (Yes/No/Abstain) and election (candidate ranking) proposals, with built-in tie-break resolution.
**Contract File:** `contracts/Voting/Voting.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story | Title                                                     | Contract | Frontend | Effort |
| ---------- | --------------------------------------------------------- | :------: | :------: | ------ |
| US-VOT-001 | Create a directive proposal (Yes/No/Abstain)              | ✅       | 🚫       | M      |
| US-VOT-002 | Create an election proposal (candidates with vote counts) | ✅       | 🚫       | M      |
| US-VOT-003 | Conclude a proposal and auto-process results              | ✅       | 🚫       | M      |
| US-VOT-004 | Resolve a tie via one of four tie-break options           | ✅       | 🚫       | L      |

**Contract: 4 / 4 — Frontend: 0 / 4**

---

## Implementation Notes

- **Contract:** `contracts/Voting/Voting.sol`
- **Key functions:** `addProposal`, `voteDirective`, `voteElection`, `concludeProposal`, `resolveTie`, `selectWinner`, `getProposalById`, `setBoardOfDirectors`
- **Access roles:** Anyone can create a proposal; only eligible voters can vote; only proposal creator can conclude; `onlyOwner` for `setBoardOfDirectors`
- **Dependencies:** Officer (runtime BoardOfDirectors resolution for election results)
- **Tie-break options:** `RANDOM_SELECTION` (blockhash), `INCREASE_WINNER_COUNT` (include all tied), `FOUNDER_CHOICE` (creator picks), `RUNOFF_ELECTION` (new election with tied candidates only)
- **Note:** Alternative/earlier voting system alongside Proposals + Elections contracts

---

## US-VOT-001: Create a Directive Proposal (Yes/No/Abstain)

> **As a** team member, **I want to** create a directive proposal with a defined voter list, **so that** a group decision is recorded on-chain with a clear outcome.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `addProposal(title, description, isElection=false, winnerCount, voters[], candidates=[])` creates a directive proposal
- [x] `voters[]` is the explicit eligible voter list for this proposal
- [x] `winnerCount` ignored for directive proposals (majority Yes/No determines outcome)
- [x] Proposal stored with status `Active` and empty vote tallies
- [x] `getProposalById(proposalId)` returns the full proposal struct
- [x] No restriction on who can create a proposal

---

## US-VOT-002: Create an Election Proposal (Candidates with Vote Counts)

> **As a** team member, **I want to** create an election proposal with candidates and a winner count, **so that** a ranked vote determines who fills a set of seats.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `addProposal(title, description, isElection=true, winnerCount, voters[], candidates[])` creates an election proposal
- [x] `candidates[]` must be non-empty; reverts otherwise
- [x] `winnerCount` must be ≥ 1 and ≤ `candidates.length`
- [x] `voteElection(proposalId, candidateAddress)` records a vote for a specific candidate
- [x] Each eligible voter may vote exactly once
- [x] Candidates' vote counts incremented on each `voteElection` call

---

## US-VOT-003: Conclude a Proposal and Auto-Process Results

> **As a** proposal creator, **I want to** finalize a proposal once voting is done, **so that** results are recorded and the Board of Directors is updated for election proposals.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-VOT-001, US-VOT-002

### Acceptance Criteria

- [x] `concludeProposal(proposalId)` restricted to the proposal creator
- [x] For directive proposals: Yes/No tallied; `Succeeded` if Yes > No, `Defeated` otherwise
- [x] For election proposals: candidates sorted by vote count descending; top `winnerCount` selected
- [x] If election and no tie: `setBoardOfDirectors(winners[])` called via Officer lookup
- [x] If tie detected: proposal enters `TieBreakPending` state; creator must call `resolveTie`
- [x] Reverts if proposal is not in `Active` state

---

## US-VOT-004: Resolve a Tie via One of Four Tie-Break Options

> **As a** proposal creator, **I want to** resolve a tied election using a configured tie-break method, **so that** the correct number of winners is determined even when candidates have equal votes.

**Status:** ✅ | **Priority:** P2 | **Effort:** L | **Dependencies:** US-VOT-003

### Acceptance Criteria

- [x] `resolveTie(proposalId, TieBreakOption)` restricted to the proposal creator
- [x] `RANDOM_SELECTION`: uses `blockhash(block.number - 1)` to pseudo-randomly pick from tied candidates
- [x] `INCREASE_WINNER_COUNT`: includes all tied candidates as winners (winner count expanded)
- [x] `FOUNDER_CHOICE`: proposal enters `FounderChoicePending` state; creator calls `selectWinner(proposalId, winner)` to manually pick
- [x] `RUNOFF_ELECTION`: creates a new `Active` proposal containing only the tied candidates for a second vote
- [x] After resolution (except `RUNOFF_ELECTION`): `setBoardOfDirectors(winners[])` called automatically
- [x] Reverts if proposal is not in `TieBreakPending` state

---

_[← Back to index](../README.md)_
