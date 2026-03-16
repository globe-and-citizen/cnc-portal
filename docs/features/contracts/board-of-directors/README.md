# Contract: BoardOfDirectors

**Epic Goal:** Provide multi-signature governance so board decisions require majority approval before execution.
**Contract File:** `contracts/BoardOfDirectors.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story | Title                                            | Status | Effort |
| ---------- | ------------------------------------------------ | ------ | ------ |
| US-BOD-001 | Set board membership (from Elections results)    | ✅     | S      |
| US-BOD-002 | Create a multi-sig action targeting any contract | ✅     | M      |
| US-BOD-003 | Approve a pending action                         | ✅     | S      |
| US-BOD-004 | Revoke approval of a pending action              | ✅     | S      |
| US-BOD-005 | Auto-execute an action on majority approval      | ✅     | M      |
| US-BOD-006 | Manage contract owners via self-approved action  | ✅     | M      |

**6 / 6 stories complete**

---

## Implementation Notes

- **Contract:** `contracts/BoardOfDirectors.sol`
- **Key functions:** `addAction`, `approve`, `revoke`, `setBoardOfDirectors`, `getBoardOfDirectors`, `isMember`
- **Access roles:** Board members only for `addAction`, `approve`, `revoke`; Elections contract for `setBoardOfDirectors`; `onlySelf` for ownership management
- **Dependencies:** Elections (sets board membership via `setBoardOfDirectors`)
- **Pattern:** Majority >50% required; auto-executes on the approval that crosses the threshold; encoded ABI calls against any target contract

---

## US-BOD-001: Set Board Membership (from Elections Results)

> **As an** elections contract, **I want to** update the board member list after results are published, **so that** governance is always controlled by the elected members.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `setBoardOfDirectors(members[])` replaces the entire board member list
- [x] Restricted to the Elections contract address (resolved via Officer at call time)
- [x] Reverts if `members[]` is empty
- [x] Previous members are removed; new list takes effect immediately
- [x] `getBoardOfDirectors()` reflects the updated list after the call
- [x] `isMember(address)` returns `true` only for current members

---

## US-BOD-002: Create a Multi-Sig Action Targeting Any Contract

> **As a** board member, **I want to** propose an encoded on-chain action against any target contract, **so that** board decisions can trigger any function call upon majority approval.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-BOD-001

### Acceptance Criteria

- [x] `addAction(target, description, data)` creates a pending action and returns its `actionId`
- [x] Restricted to current board members (`isMember(msg.sender)`)
- [x] `data` is ABI-encoded calldata for the target function
- [x] Action stored in state with status `Pending` and zero approvals
- [x] Proposer's approval is NOT automatically counted (explicit approve call required)

---

## US-BOD-003: Approve a Pending Action

> **As a** board member, **I want to** approve a pending action, **so that** my vote is counted toward the majority threshold.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** US-BOD-002

### Acceptance Criteria

- [x] `approve(actionId)` records the caller's approval
- [x] Restricted to current board members
- [x] Reverts if the action does not exist or is not in `Pending` state
- [x] Reverts if the caller has already approved
- [x] Increments approval count; triggers execution if majority is reached

---

## US-BOD-004: Revoke Approval of a Pending Action

> **As a** board member, **I want to** revoke my approval before an action executes, **so that** I can change my vote if new information comes to light.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-BOD-003

### Acceptance Criteria

- [x] `revoke(actionId)` removes the caller's approval
- [x] Restricted to current board members who have previously approved
- [x] Reverts if the action has already been executed
- [x] Decrements approval count; action remains `Pending` if below majority
- [x] Caller can re-approve after revoking

---

## US-BOD-005: Auto-Execute an Action on Majority Approval

> **As a** board, **I want to** have approved actions execute automatically once majority is reached, **so that** no additional transaction is needed after the deciding approval.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-BOD-003

### Acceptance Criteria

- [x] On each `approve()` call, checks if `approvalCount > totalMembers / 2`
- [x] If majority is reached, executes `target.call(data)` immediately
- [x] Action status updated to `Executed` after successful call
- [x] Reverts (with the inner revert reason) if the target call fails
- [x] No further approvals or revocations possible after execution

---

## US-BOD-006: Manage Contract Owners via Self-Approved Action

> **As a** board, **I want to** change ownership of any team contract via a board-approved action, **so that** ownership management is subject to the same multi-sig governance as other decisions.

**Status:** ✅ | **Priority:** P2 | **Effort:** M | **Dependencies:** US-BOD-005

### Acceptance Criteria

- [x] BoardOfDirectors itself is a valid action target (can call functions on itself)
- [x] Functions restricted to `onlySelf` can only be called via an executed board action
- [x] Transfer of contract ownership encoded as ABI calldata and approved via standard action flow
- [x] No single board member can transfer ownership unilaterally

---

_[← Back to index](../README.md)_
