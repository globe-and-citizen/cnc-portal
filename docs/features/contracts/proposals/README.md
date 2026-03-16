# Contract: Proposals

**Epic Goal:** Let board members create formal proposals and record Yes/No/Abstain votes with automatic tallying.
**Contract File:** `contracts/Proposals/Proposals.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story  | Title                                                | Contract | Frontend | Effort |
| ----------- | ---------------------------------------------------- | :------: | :------: | ------ |
| US-PROP-001 | Create a proposal (board members only)               | ✅       | 🚫       | S      |
| US-PROP-002 | Vote Yes/No/Abstain on a proposal                    | ✅       | 🚫       | S      |
| US-PROP-003 | Auto-tally results when all board members have voted | ✅       | 🚫       | M      |
| US-PROP-004 | Manually tally results after voting period ends      | ✅       | 🚫       | S      |

**Contract: 4 / 4 — Frontend: 0 / 4**

---

## Implementation Notes

- **Contract:** `contracts/Proposals/Proposals.sol`
- **Key functions:** `createProposal`, `castVote`, `tallyResults`
- **Access roles:** Board members only for `createProposal` and `castVote`; anyone can call `tallyResults` once period ends
- **Dependencies:** BoardOfDirectors (live membership check via Officer resolution)
- **States:** `Active` → `Succeeded` / `Defeated` / `Expired`
- **Pattern:** Board membership checked live from BoardOfDirectors at vote time; auto-tallied when all members vote; manual tally available after end date

---

## US-PROP-001: Create a Proposal (Board Members Only)

> **As a** board member, **I want to** create a formal proposal with a voting period, **so that** decisions are discussed and recorded on-chain.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `createProposal(title, description, proposalType, startDate, endDate)` creates a new proposal and returns its ID
- [x] Restricted to current board members (checked via live BoardOfDirectors lookup)
- [x] `startDate` must be in the future or now; `endDate` must be after `startDate`
- [x] Proposal starts in `Active` state
- [x] Emits `ProposalCreated` event

---

## US-PROP-002: Vote Yes/No/Abstain on a Proposal

> **As a** board member, **I want to** cast a Yes, No, or Abstain vote on an active proposal, **so that** my position is recorded on-chain.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** US-PROP-001

### Acceptance Criteria

- [x] `castVote(proposalId, VoteOption)` records the caller's vote (0=No, 1=Yes, 2=Abstain)
- [x] Restricted to current board members
- [x] Reverts if the proposal is not in `Active` state
- [x] Reverts if the voting period has not started or has already ended
- [x] Reverts if the caller has already voted on this proposal
- [x] Triggers auto-tally if all board members have now voted (see US-PROP-003)

---

## US-PROP-003: Auto-Tally Results When All Board Members Have Voted

> **As a** system, **I want to** finalize a proposal immediately when every board member has cast a vote, **so that** results are available without waiting for the voting period to end.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-PROP-002

### Acceptance Criteria

- [x] After each `castVote`, the contract checks if all current board members have voted
- [x] If all have voted, `tallyResults` logic runs automatically in the same transaction
- [x] Proposal state updated to `Succeeded` if Yes > No, `Defeated` if No >= Yes
- [x] Abstain votes do not count toward majority but do satisfy the "all voted" check
- [x] `Expired` state set if end date passes without all members having voted and manual tally not yet called

---

## US-PROP-004: Manually Tally Results After Voting Period Ends

> **As a** team member, **I want to** trigger result tallying after the voting period ends (even if not all members voted), **so that** proposals are not stuck in limbo.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-PROP-002

### Acceptance Criteria

- [x] `tallyResults(proposalId)` can be called by anyone after `endDate` has passed
- [x] Reverts if the proposal is not in `Active` state
- [x] Reverts if `endDate` has not yet passed (and not all members have voted)
- [x] Sets state to `Succeeded`, `Defeated`, or `Expired` based on vote counts
- [x] `Expired` used when too few votes were cast to determine a result

---

_[← Back to index](../README.md)_
