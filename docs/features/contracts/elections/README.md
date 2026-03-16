# Contract: Elections

**Epic Goal:** Run formal board elections with candidates, eligible voters, and automatic result publication.
**Contract File:** `contracts/Elections/Elections.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story  | Title                                                       | Status | Effort |
| ----------- | ----------------------------------------------------------- | ------ | ------ |
| US-ELEC-001 | Create a Board election with candidates and eligible voters | ✅     | M      |
| US-ELEC-002 | Cast a vote for a candidate                                 | ✅     | S      |
| US-ELEC-003 | Publish election results and update Board of Directors      | ✅     | M      |
| US-ELEC-004 | Query election details, candidates, and voters              | ✅     | S      |
| US-ELEC-005 | Enforce only one active election at a time                  | ✅     | S      |

**5 / 5 stories complete**

---

## Implementation Notes

- **Contract:** `contracts/Elections/Elections.sol`
- **Key functions:** `createElection`, `castVote`, `publishResults`, `getElectionResults`
- **Access roles:** `onlyOwner` for `createElection`; eligible voters only for `castVote`; anyone can call `publishResults` once conditions are met
- **Dependencies:** Officer (runtime resolution of BoardOfDirectors address at result publication time)
- **Pattern:** Seat count must be odd (tie prevention); candidates sorted by vote count descending, ties broken by address ascending; results published once all votes cast or end date passed

---

## US-ELEC-001: Create a Board Election with Candidates and Eligible Voters

> **As a** team owner, **I want to** create a formal board election with defined candidates and voter lists, **so that** board composition changes are decided through an auditable on-chain process.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `createElection(title, description, startDate, endDate, seatCount, candidates[], voters[])` creates a new election and returns its ID
- [x] Restricted to `onlyOwner`
- [x] `seatCount` must be odd (reverts otherwise — tie prevention)
- [x] `candidates[]` and `voters[]` must be non-empty
- [x] Start date must be in the future or now; end date must be after start date
- [x] Emits `ElectionCreated` event with the new election ID

---

## US-ELEC-002: Cast a Vote for a Candidate

> **As an** eligible voter, **I want to** cast my vote for a candidate in the active election, **so that** my preference is recorded on-chain.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** US-ELEC-001

### Acceptance Criteria

- [x] `castVote(electionId, candidateAddress)` records the caller's vote
- [x] Reverts if caller is not on the eligible voters list for that election
- [x] Reverts if caller has already voted in this election
- [x] Reverts if `candidateAddress` is not a registered candidate
- [x] Reverts if the election has not started or has already ended
- [x] Increments the candidate's vote count
- [x] Marks the voter as having voted

---

## US-ELEC-003: Publish Election Results and Update Board of Directors

> **As a** team member, **I want to** publish results once voting is complete, **so that** the Board of Directors is updated automatically without manual intervention.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-ELEC-002

### Acceptance Criteria

- [x] `publishResults(electionId)` can be called by anyone once all votes are cast or the end date has passed
- [x] Sorts candidates by vote count descending; ties broken by address ascending
- [x] Selects top `seatCount` candidates as winners
- [x] Resolves BoardOfDirectors address at runtime via `Officer.findDeployedContract("BOARD_OF_DIRECTORS")`
- [x] Calls `BoardOfDirectors.setBoardOfDirectors(winners[])` to update board membership
- [x] Reverts if called before all votes are cast and end date has not passed
- [x] Reverts if results already published for this election

---

## US-ELEC-004: Query Election Details, Candidates, and Voters

> **As a** team member, **I want to** inspect an election's details, candidate standings, and voter participation, **so that** the process is transparent and auditable.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-ELEC-001

### Acceptance Criteria

- [x] `getElectionResults(electionId)` returns the sorted winner addresses after publication
- [x] Election struct includes: title, description, startDate, endDate, seatCount, status, candidates with vote counts, and voters with voted status
- [x] All query functions are `view` — no gas cost when called off-chain
- [x] No access restriction on reads

---

## US-ELEC-005: Enforce Only One Active Election at a Time

> **As a** team owner, **I want to** be prevented from creating a new election while one is ongoing, **so that** the voting process is not fragmented across concurrent elections.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-ELEC-001

### Acceptance Criteria

- [x] `createElection` reverts if an election is currently in `Active` state
- [x] An election becomes inactive once results are published or end date passes with no further action
- [x] Only one `Active` election ID is tracked at a time

---

_[← Back to index](../README.md)_
