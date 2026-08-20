# Contract: Elections

**Epic Goal:** Run formal board elections with candidates, eligible voters, and on-chain result
publication that seats the Board of Directors. **Contract File:**
`contracts/Elections/Elections.sol` (with `ElectionTypes.sol` and `ElectionUtils.sol`)
**Upgradeable:** Yes (Beacon) **Contract version:** `2.0.0` **Last updated:** 2026-08-17

---

## Status Overview

| User Story  | Title                                                       | Contract | Frontend | Effort |
| ----------- | ----------------------------------------------------------- | :------: | :------: | ------ |
| US-ELEC-001 | Create a Board election with candidates and eligible voters |    ✅    |    ⚠️    | M      |
| US-ELEC-002 | Cast a vote for a candidate                                 |    ✅    |    ⚠️    | S      |
| US-ELEC-003 | Publish election results and update Board of Directors      |    ✅    |    ⚠️    | M      |
| US-ELEC-004 | Query election details, candidates, and voters              |    ✅    |    ⚠️    | S      |
| US-ELEC-005 | Enforce only one election at a time                         |    ✅    |    ✅    | S      |
| US-ELEC-006 | Suspend and resume the contract                             |    ✅    |    🚫    | S      |

**Contract: 6 / 6 — Frontend: 5 / 6 (built, with known defects)**

✅ done · ⚠️ built with known defects · 🚫 not built

> **The frontend exists.** Two pages cover this contract — `/teams/:id/administration/bod-elections`
> and `.../bod-elections-details`. What they do, what is broken and how to test it is in the
> [Elections user stories](../../elections/Readme.md), which is the authority on frontend behaviour.
> This document is the authority on contract behaviour.

---

## Implementation Notes

- **Contract:** `contracts/Elections/Elections.sol`
- **Key functions:** `createElection`, `castVote`, `publishResults`, `getElectionResults`,
  `getElection`, `getElectionWinners`, `pause` / `unpause`
- **Events:** `ElectionCreated`, `VoteSubmitted`, `ResultsPublished`
- **Access roles:** `onlyOwner` for `createElection`, `publishResults`, `pause` and `unpause`;
  eligible voters only for `castVote`; reads are unrestricted. The owner is whoever the Officer
  installed as owner at deployment — the team owner, **not** the board.
- **Dependencies:** Officer (runtime resolution of the BoardOfDirectors address at publication time,
  via `findDeployedContract("BoardOfDirectors")`). The Officer address is captured in `initialize`
  from `msg.sender`.
- **Ids:** the first election is id `1`; id `0` is the "not found" sentinel, so every entry point
  rejects an unknown id with `Elections__ElectionNotFound`.
- **Pattern:** seat count must be odd and non-zero (tie prevention); candidates are sorted by vote
  count descending with ties broken by address ascending, so the same votes always produce the same
  board; results are publishable once every eligible voter has voted **or** the end date has passed.
- **Pausable:** the whole write surface (`createElection`, `castVote`, `publishResults`) is gated by
  `whenNotPaused`.
- **Known dead code:** `ElectionUtils.MAX_CANDIDATES` (20) is declared but never enforced — the
  candidate list has no upper bound today.

---

## US-ELEC-001: Create a Board Election with Candidates and Eligible Voters

> **As a** team owner, **I want to** create a formal board election with defined candidates and
> voter lists, **so that** board composition changes are decided through an auditable on-chain
> process.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `createElection(title, description, startDate, endDate, seatCount, candidates[], voters[])`
      creates a new election and returns its id
- [x] Restricted to `onlyOwner`, and refused while the contract is paused
- [x] `seatCount` must be odd and non-zero — `ElectionUtils__InvalidSeatCount` otherwise. Any odd
      number is accepted, including 1; the three-director minimum is a frontend rule only
- [x] `startDate` must be **strictly in the future** and `endDate` strictly after it —
      `ElectionUtils__InvalidDates` otherwise. A start equal to the current block timestamp is
      rejected
- [x] `candidates[]` must hold at least `seatCount` entries
      (`ElectionUtils__InsufficientCandidates`) and no duplicates
      (`ElectionUtils__DuplicateCandidates`)
- [x] `voters[]` must be non-empty (`ElectionUtils__NoEligibleVoters`) and free of duplicates
      (`ElectionUtils__DuplicateVoters`)
- [x] Emits `ElectionCreated(electionId, title, createdBy, startDate, endDate, seatCount)`

**Not enforced by the contract:** candidates are never checked for membership of the team, and the
voter roll is fixed at creation — there is no function to add or remove a voter afterwards. The
portal fills the roll with every current team member, so anyone joining later cannot vote.

---

## US-ELEC-002: Cast a Vote for a Candidate

> **As an** eligible voter, **I want to** cast my vote for a candidate in the active election, **so
> that** my preference is recorded on-chain.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** US-ELEC-001

### Acceptance Criteria

- [x] `castVote(electionId, candidateAddress)` records the caller's vote, and is refused while the
      contract is paused
- [x] Reverts with `Elections__ElectionNotActive` outside the `[startDate, endDate]` window —
      checked **before** eligibility
- [x] Reverts with `Elections__NotEligibleVoter` if the caller is not on the voter list
- [x] Reverts with `Elections__AlreadyVoted` if the caller has already voted in this election
- [x] Reverts with `ElectionUtils__InvalidCandidate` for the zero address or any address that is not
      a registered candidate
- [x] Increments the candidate's vote count and the election's running total, and marks the voter as
      having voted
- [x] Records **who** the voter chose, readable through `getVoterChoice(electionId, voter)` — votes
      are public, not secret
- [x] Emits `VoteSubmitted(electionId, voter, candidate)`

---

## US-ELEC-003: Publish Election Results and Update Board of Directors

> **As a** team owner, **I want to** publish results once voting is complete, **so that** the Board
> of Directors is updated without manual intervention.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-ELEC-002

### Acceptance Criteria

- [x] `publishResults(electionId)` is **`onlyOwner`** — not callable by anyone — and is refused
      while the contract is paused
- [x] Reverts with `Elections__ResultsNotReady` unless every eligible voter has voted **or** the end
      date has passed
- [x] Reverts with `Elections__ResultsAlreadyPublished` on a second call
- [x] Sorts candidates by vote count descending, ties broken by address ascending, and takes the top
      `seatCount` as winners
- [x] Resolves the BoardOfDirectors address at runtime via
      `Officer.findDeployedContract("BoardOfDirectors")`, reverting with
      `Elections__OfficerAddressNotSet` or `Elections__BoardOfDirectorsNotFound`
- [x] Calls `BoardOfDirectors.setBoardOfDirectors(winners[])`, **replacing** the previous board
      wholesale
- [x] Emits `ResultsPublished(electionId, winners)`

**Consequences worth knowing:** the winners array is always exactly `seatCount` long, so an election
that received no votes at all still seats a board — the lowest candidate addresses win by tie-break.
And publishing is the only thing that unblocks the next election (US-ELEC-005), so an election left
unpublished strands the team.

---

## US-ELEC-004: Query Election Details, Candidates, and Voters

> **As a** team member, **I want to** inspect an election's details, candidate standings, and voter
> participation, **so that** the process is transparent and auditable.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-ELEC-001

### Acceptance Criteria

- [x] `getElection(id)` returns title, description, creator, start and end dates, seat count and the
      published flag
- [x] `getElectionCandidates(id)`, `getElectionEligibleVoters(id)`, `getVoteCount(id)`,
      `getVoteCounts(id, candidate)`, `hasVoted(id, voter)`, `isEligibleVoter(id, voter)` and
      `getVoterChoice(id, voter)` expose the rest of the state
- [x] `getElectionIds()` and `getNextElectionId()` enumerate elections without an off-chain index
- [x] `getElectionWinners(id)` returns the published winners, reverting with
      `Elections__ResultsNotReady` before publication
- [x] `getElectionResults(id)` computes the **provisional** standings at any time, including before
      the election has ended — it is a projection, not a result. Callers must gate it on
      `resultsPublished`, otherwise they announce winners for a ballot still in progress
- [x] All query functions are `view` — no gas cost when called off-chain, and no access restriction
- [x] `getVoteCounts` is the one read that does **not** validate the election id: an unknown id
      quietly returns `0` instead of reverting

---

## US-ELEC-005: Enforce Only One Election at a Time

> **As a** team owner, **I want to** be prevented from creating a new election while one is
> unresolved, **so that** the voting process is not fragmented across concurrent elections.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-ELEC-001

### Acceptance Criteria

- [x] `createElection` reverts with `Elections__ElectionIsOngoing` while the **previous** election's
      results have not been published
- [x] The gate is **publication**, not the end date: an election whose end date has passed still
      blocks a new one until someone publishes it
- [x] The check looks only at the immediately preceding id, which is enough because that id can only
      exist if every earlier one was published
- [x] Once results are published, the next election can be created

---

## US-ELEC-006: Suspend and Resume the Contract

> **As a** team owner, **I want to** freeze the elections contract, **so that** a ballot opened by
> mistake does not have to run to its end date.

**Status:** ✅ contract / 🚫 no UI | **Priority:** P4 | **Effort:** S | **Dependencies:**
US-ELEC-001

### Acceptance Criteria

- [x] `pause()` and `unpause()` are `onlyOwner`
- [x] While paused, `createElection`, `castVote` and `publishResults` all revert with
      `EnforcedPause`; reads keep working
- [x] Pausing preserves votes already cast — resuming continues the same election
- [ ] The portal exposes the control, and explains a paused contract to members rather than letting
      their transactions fail at the wallet — see US-EL-09 in the
      [user stories](../../elections/Readme.md)

---

## Error Reference

| Error                                   | Raised when                                          |
| --------------------------------------- | ---------------------------------------------------- |
| `Elections__ElectionNotFound`           | Unknown election id (id `0` is the sentinel)         |
| `Elections__ElectionNotActive`          | Vote outside the start/end window                    |
| `Elections__ElectionIsOngoing`          | Previous election's results are not published        |
| `Elections__AlreadyVoted`               | Second vote from the same address                    |
| `Elections__NotEligibleVoter`           | Caller is not on the voter roll                      |
| `Elections__ResultsAlreadyPublished`    | Second call to `publishResults`                      |
| `Elections__ResultsNotReady`            | Publishing too early, or reading unpublished winners |
| `Elections__OfficerAddressNotSet`       | Officer address is zero at publication time          |
| `Elections__BoardOfDirectorsNotFound`   | Officer cannot resolve `"BoardOfDirectors"`          |
| `Elections__ZeroSender`                 | `initialize` called by the zero address              |
| `ElectionUtils__InvalidSeatCount`       | Seat count is zero or even                           |
| `ElectionUtils__InvalidDates`           | Start not in the future, or end not after start      |
| `ElectionUtils__InvalidCandidate`       | Vote for the zero address or a non-candidate         |
| `ElectionUtils__InsufficientCandidates` | Fewer candidates than seats                          |
| `ElectionUtils__DuplicateCandidates`    | Same candidate listed twice                          |
| `ElectionUtils__NoEligibleVoters`       | Empty voter list                                     |
| `ElectionUtils__DuplicateVoters`        | Same voter listed twice                              |

Declared but never raised today: `Elections__ElectionEnded`, `Elections__Unauthorized` and
`ElectionUtils__ElectionIsOngoing` (the contract raises its own `Elections__ElectionIsOngoing`
instead).

---

_[← Back to index](../README.md)_ · _[Elections user stories](../../elections/Readme.md)_
