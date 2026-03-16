# Contract: Vesting

**Epic Goal:** Provide linear ERC20 token vesting schedules with cliff periods, organized into teams.
**Contract File:** `contracts/Vesting.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story  | Title                                                        | Status | Effort |
| ----------- | ------------------------------------------------------------ | ------ | ------ |
| US-VEST-001 | Create a vesting team with a token                           | ✅     | S      |
| US-VEST-002 | Add a linear vesting schedule with cliff for a member        | ✅     | M      |
| US-VEST-003 | Release vested tokens to the member                          | ✅     | M      |
| US-VEST-004 | Stop vesting early (releasable to member, unvested to owner) | ✅     | M      |
| US-VEST-005 | View vested and releasable amounts                           | ✅     | S      |

**5 / 5 stories complete**

---

## Implementation Notes

- **Contract:** `contracts/Vesting.sol`
- **Key functions:** `createTeam`, `addVesting`, `release`, `stopVesting`, `vestedAmount`, `releasable`, `getTeamVestingsWithMembers`, `getTeamAllArchivedVestingsFlat`
- **Access roles:** `onlyOwner` for `createTeam`, `addVesting`, `stopVesting`; `release` callable by the vesting member themselves
- **Pattern:** Team-based — each team has an owner and a token; cliff prevents any release until elapsed; linear vesting after cliff; stopped vestings archived per member/team
- **Protections:** `PausableUpgradeable`, `ReentrancyGuard`

---

## US-VEST-001: Create a Vesting Team with a Token

> **As a** team owner, **I want to** create a vesting group (team) associated with a specific ERC20 token, **so that** I can organize multiple members' vesting schedules under one umbrella.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `createTeam(teamId, teamOwner, tokenAddress)` registers a new vesting team
- [x] Restricted to the Vesting contract owner (global admin)
- [x] `teamId` must be unique; reverts if already exists
- [x] `tokenAddress` must be a non-zero address
- [x] `teamOwner` becomes the admin for that team's vesting schedules

---

## US-VEST-002: Add a Linear Vesting Schedule with Cliff for a Member

> **As a** vesting team owner, **I want to** assign a linear vesting schedule with a cliff period to a team member, **so that** they earn tokens proportionally over time after a lock-up period.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-VEST-001

### Acceptance Criteria

- [x] `addVesting(teamId, member, start, duration, cliff, totalAmount, token)` creates a new vesting schedule
- [x] Restricted to the team owner for that `teamId`
- [x] `cliff` ≤ `duration`; reverts otherwise
- [x] `start` can be in the past (supports retro-active vesting for existing agreements)
- [x] No tokens releasable before `start + cliff` elapses
- [x] After cliff: tokens vest linearly; `vestedAmount = totalAmount × (elapsed - cliff) / (duration - cliff)`
- [x] Team owner must pre-fund the Vesting contract with `totalAmount` of the token before adding the schedule

---

## US-VEST-003: Release Vested Tokens to the Member

> **As a** vesting member, **I want to** claim my vested (and not yet released) tokens, **so that** I receive the tokens I have earned up to now.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-VEST-002

### Acceptance Criteria

- [x] `release(teamId)` transfers the releasable amount to `msg.sender`
- [x] `releasable = vestedAmount - alreadyReleased`
- [x] Reverts if `releasable == 0`
- [x] Reverts if cliff period has not yet elapsed
- [x] Reverts if contract is paused
- [x] ReentrancyGuard protects the transfer
- [x] `alreadyReleased` incremented after each successful release

---

## US-VEST-004: Stop Vesting Early (Releasable to Member, Unvested to Owner)

> **As a** vesting team owner, **I want to** terminate a member's vesting schedule before it completes, **so that** the member receives tokens vested so far and unvested tokens are returned to the owner.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-VEST-002

### Acceptance Criteria

- [x] `stopVesting(member, teamId)` restricted to the team owner
- [x] Computes `releasable` at stop time and transfers it to `member`
- [x] Remaining unvested tokens transferred back to the team owner
- [x] Vesting schedule archived (moved to stopped history) — no further releases possible
- [x] `getTeamAllArchivedVestingsFlat(teamId)` includes the stopped schedule with stop timestamp
- [x] Reverts if no active vesting exists for `member` in `teamId`

---

## US-VEST-005: View Vested and Releasable Amounts

> **As a** team member, **I want to** check how much I have vested and how much I can release right now, **so that** I can decide when to call `release`.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-VEST-002

### Acceptance Criteria

- [x] `vestedAmount(member, teamId)` returns total tokens vested to date (including already released)
- [x] `releasable(member, teamId)` returns tokens available for immediate release (`vestedAmount - released`)
- [x] Both functions return `0` if cliff has not elapsed
- [x] Both are `view` — no gas cost when called off-chain
- [x] `getTeamVestingsWithMembers(teamId)` returns full vesting data for all members in a team

---

_[← Back to index](../README.md)_
