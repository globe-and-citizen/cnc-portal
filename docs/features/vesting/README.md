# Vesting — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL)

**Last updated:** 2026-08-21

These stories describe the Vesting V2 journey exposed by the portal. Legacy Vesting versions are
outside this feature scope.

## Human Review Contract

Acceptance criteria are the centre of human review. Automated tests provide evidence, but do not
replace the reviewer's decision.

- Each criterion describes one observable functional outcome.
- Each criterion must produce a clear pass or fail result.
- A story passes only when a human reviewer validates every criterion for the reviewed release.
- Story status describes current implementation progress; checkboxes remain empty until review.

## Product Model

- A vesting schedule is an on-chain **promise of future team shares**, not a token transfer.
- Creating a schedule neither mints nor locks shares. The Investor contract mints only the amount
  that has become releasable when the beneficiary claims, or when the owner stops the schedule.
- Accrual is linear from the start to the fully vested boundary. A cliff blocks claims; it does not
  delay the beginning of accrual.
- One beneficiary may have several concurrent schedules. Every action targets one schedule by its
  index.
- The portal reads and writes only the current Vesting V2 contract selected for the team.
- Portal boundaries are selected in local time with minute precision, shown in UTC for verification,
  and submitted on-chain with zero seconds.

## Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Active: Owner creates schedule
    Active --> Active: Beneficiary releases accrued shares
    Active --> Completed: Full grant released
    Active --> Cancelled: Owner stops schedule
    Completed --> [*]
    Cancelled --> [*]

    note right of Active
      Shares accrue linearly.
      Claims remain locked until the cliff ends.
    end note

    note right of Completed
      UI status only: the on-chain schedule
      remains active after full release.
    end note
```

## Status Overview

| User Story     | Title                                    | Actor          | Status  | Priority | Effort |
| -------------- | ---------------------------------------- | -------------- | ------- | :------: | ------ |
| US-VESTING-001 | Create a minute-precise vesting schedule | Team owner     | ✅ Done |    P1    | M      |
| US-VESTING-002 | View schedules and aggregate totals      | Member / Owner | ✅ Done |    P1    | M      |
| US-VESTING-003 | Release accrued shares                   | Beneficiary    | ✅ Done |    P1    | M      |
| US-VESTING-004 | Stop an active vesting schedule          | Team owner     | ✅ Done |    P1    | M      |
| US-VESTING-005 | Understand vested and claimable progress | Member / Owner | ✅ Done |    P2    | M      |

## US-VESTING-001: Create a Minute-Precise Vesting Schedule

**As a** team owner **I want to** configure and review a beneficiary's vesting schedule **So that**
the grant is recorded with unambiguous amounts and time boundaries

### Acceptance Criteria

- [x] Only the team owner can create a schedule; archived teams cannot create one.
- [x] The owner can select one current team member and enter a positive grant with up to six
      decimals.
- [x] Start, end, and optional cliff boundaries are set to the minute and shown in local time and
      UTC.
- [x] End is after start, and the cliff is between start and end.
- [x] The owner can use duration and cliff presets or enter custom boundaries.
- [x] Review shows the beneficiary, grant, boundaries, cliff effect, and first claimable amount.
- [x] Returning from review preserves the entered schedule.
- [x] Confirmation creates an on-chain commitment without minting shares.
- [x] Success refreshes the schedules; cancellation or failure creates nothing and preserves
      context.
- [x] The same beneficiary can receive multiple schedules.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done

**Dependencies:** Current team, current Vesting contract, current Investor contract

## US-VESTING-002: View Schedules and Aggregate Totals

**As a** team member or owner **I want to** see the team's vesting commitments and releases **So
that** I can understand the current vesting position

### Acceptance Criteria

- [x] The page shows Promised, Vested, Claimable, and Released totals.
- [x] Every grant has one schedule entry, including repeated beneficiaries.
- [x] Users can switch between My schedules and Team schedules.
- [x] Users can filter by All, Active, Claimable, Completed, or Cancelled.
- [x] Completed means fully released; Cancelled means stopped by the owner.
- [x] Create, Release, and Stop refresh totals and schedules.
- [x] Loading, empty, and read-error states are visible and actionable.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done

**Dependencies:** US-VESTING-001

## US-VESTING-003: Release Accrued Shares

**As a** vesting beneficiary **I want to** release shares accrued by one of my schedules **So that**
the earned shares are minted to my wallet

### Acceptance Criteria

- [x] Only the beneficiary can release shares from their active schedule.
- [x] Release affects only the selected schedule.
- [x] Release is unavailable when the claimable amount is zero.
- [x] Review shows the claimable amount before wallet confirmation.
- [x] Release mints the claimable amount without exceeding the grant.
- [x] Repeated releases cannot mint the same shares twice.
- [x] Success updates the released amount; cancellation or failure changes nothing.
- [x] Archived teams or paused Vesting contracts cannot release shares.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done

**Dependencies:** US-VESTING-001

## US-VESTING-004: Stop an Active Vesting Schedule

**As a** team owner **I want to** stop one active vesting schedule **So that** future unvested
shares are cancelled while the beneficiary keeps what has already accrued

### Acceptance Criteria

- [x] Only the team owner can stop an active schedule.
- [x] A confirmation shows the shares to release and cancel before signing.
- [x] Stop affects only the selected schedule.
- [x] The beneficiary receives the claimable shares; the unvested remainder is cancelled.
- [x] Stopping before the cliff mints no shares.
- [x] The stopped schedule remains visible as Cancelled and cannot be used again.
- [x] Success refreshes the schedule; cancellation or failure leaves it active.
- [x] Archived teams or paused Vesting contracts cannot stop a schedule.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done

**Dependencies:** US-VESTING-001

## US-VESTING-005: Understand Vested and Claimable Progress

**As a** team member or owner **I want to** understand each schedule's accrued, released, and
claimable shares **So that** I know what can happen now and what remains locked

### Acceptance Criteria

- [x] Each schedule shows promised, vested, released, claimable, and unvested shares.
- [x] The next boundary is shown to the minute in local time and UTC.
- [x] Before the cliff, the user sees that accrued shares remain locked.
- [x] Upcoming, Cliff locked, Accruing, Claimable, Fully vested, Completed, and Cancelled are
      distinct.
- [x] Release appears only when its claimable amount is positive.
- [x] Fully vested and fully released schedules have distinct statuses.
- [x] Cancelled schedules show released and cancelled amounts.

**Priority:** P2 (High) · **Effort:** M · **Status:** ✅ Done

**Dependencies:** US-VESTING-002, US-VESTING-003, US-VESTING-004

## Human Validation

Validated on 2026-08-21 against the current contract behaviour, automated evidence, and product
review. Acceptance criteria remain the human review record; tests support each decision.

## Implementation Evidence

- [Vesting page](../../../app/src/views/team/%5Bid%5D/VestingView.vue)
- [Schedule overview and actions](../../../app/src/components/sections/VestingView/VestingFlow.vue)
- [V2 schedule read model](../../../app/src/composables/vesting/useVestingSchedules.ts)
- [V2 schedule calculations](../../../app/src/utils/vestingScheduleUtil.ts)
- [Release and Stop review](../../../app/src/components/sections/VestingView/VestingActionReviewModal.vue)
- [Schedule creation form](../../../app/src/components/sections/VestingView/forms/CreateVesting.vue)
- [Creation orchestration and validation](../../../app/src/composables/vesting/useCreateVesting.ts)
- [Frontend vesting reads](../../../app/src/composables/vesting/reads.ts)
- [Frontend vesting writes](../../../app/src/composables/vesting/writes.ts)
- [Current Vesting contract](../../../contract/contracts/Vesting.sol)
- [Contract behaviour tests](../../../contract/test/Vesting.spec.ts)
