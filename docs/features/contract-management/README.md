# Contract Management — User Stories

**Scope:** The current-contract, campaign-management, and deployment-history journeys exposed by the portal

**Last reviewed:** Not yet reviewed

These acceptance criteria follow the
[feature documentation review contract](../../platform/feature-specification-guide.md#human-review-contract).

## Product Model

- An **Officer generation** groups the contracts currently used by a team. Its current suite excludes Campaign Manager contracts, which have
  their own management journey.
- A team member can inspect the suite. A direct owner action is available only to the current contract owner; when the Board of Directors
  owns the contract, a Board member manages the action through the Board workflow.
- A **pending Board action** is an action awaiting review or approval. It is distinct from a direct owner action and can be executed only
  under the Board contract's rules.
- A **Campaign Manager** defines advertising rates and the Bank destination for validated advertising spend. It is managed separately from
  the current contract suite.
- A previous Officer generation remains available as deployment history. It is not the active suite used for current operations.

## Lifecycle

```mermaid
flowchart LR
    Member[Team member opens Contract Management] --> Current[Current contracts]
    Member --> Campaigns[Campaigns]
    Member --> History[Deployment history]

    Current --> Inspect[Inspect contract state]
    Inspect --> Direct[Owner transfers ownership or changes status]
    Inspect --> Board[Board member reviews pending Board actions]

    Campaigns --> CampaignManager[Manage Campaign Manager and campaigns]
    History --> Previous[Review previous Officer generations]
```

## Status Overview

| User Story      | Title                              | Actor                  | Status         | Priority | Effort |
| --------------- | ---------------------------------- | ---------------------- | -------------- | :------: | ------ |
| US-CONTRACT-001 | Review the current contract suite  | Team member            | 🧪 Validation  |    P1    | M      |
| US-CONTRACT-002 | Manage current contract operations | Owner / Board member   | 🧪 Validation  |    P1    | M      |
| US-CONTRACT-003 | Manage advertising campaigns       | Authorized team member | 🚧 In Progress |    P2    | L      |
| US-CONTRACT-004 | Review deployment history          | Team member            | 🚧 In Progress |    P2    | M      |

## US-CONTRACT-001: Review the Current Contract Suite

**As a** team member\
**I want to** inspect the active Officer generation and its contracts\
**So that** I can understand the contracts currently used by the team

### Acceptance Criteria

#### Happy Path

- [x] A team member can view the active Officer address, its version, and its current non-Campaign contracts.
- [x] A team member can filter the current contract suite by active or paused status.
- [x] A team member can inspect a contract's address, owner, deployer, current status, and available on-chain read data.

#### Business Rules

- [x] Campaign Manager contracts are managed through the Campaigns journey rather than the current contract suite.
- [x] A contract's paused or active status remains distinguishable in the current suite.

#### Edge & Error Cases

- [x] A team without an active Officer generation receives an unavailable-state message instead of a contract table.
- [x] A failed Officer-generation history read is reported without hiding the current team contracts.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** Current team and its active Officer generation

## US-CONTRACT-002: Manage Current Contract Operations

**As a** current contract owner or eligible Board member\
**I want to** transfer ownership, change contract status, and review pending Board actions\
**So that** the team can safely maintain its active contract suite

### Acceptance Criteria

#### Happy Path

- [x] An eligible user can transfer ownership of a current contract to a selected recipient.
- [x] An eligible user can pause an active contract or resume a paused contract.
- [x] An eligible Board member can open, review, and approve pending Board actions for a contract.
- [x] A successful direct operation refreshes the displayed contract state.

#### Business Rules

- [x] Direct contract actions are unavailable to users who are neither the current owner nor an eligible Board member for a Board-owned
      contract.
- [x] A Board-owned contract uses a Board action for an ownership transfer instead of a direct ownership write.
- [x] An archived team cannot initiate a contract operation or approve a pending Board action.

#### Edge & Error Cases

- [x] Rejecting a wallet request does not report a successful contract operation.
- [x] A failed direct ownership transfer is shown in the transfer context without changing the displayed owner.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** 🧪 Validation

**Dependencies:** US-CONTRACT-001, current contract permissions, and a connected wallet

## US-CONTRACT-003: Manage Advertising Campaigns

**As an** authorized team member\
**I want to** manage the Campaign Manager and its advertising campaigns\
**So that** validated advertising spend uses the intended rates and Bank destination

### Acceptance Criteria

#### Happy Path

- [ ] A user can identify the Campaign Manager configured for the team.
- [ ] An authorized user can manage Campaign Manager administrators and settings.
- [ ] An authorized user can create, review, and close advertising campaigns.

#### Business Rules

- [ ] Campaign Manager rates and Bank destination determine how validated advertising spend is handled.

#### Edge & Error Cases

- [ ] A team without a Campaign Manager receives an actionable unavailable-state message.

**Priority:** P2 (High) · **Effort:** L · **Status:** 🚧 In Progress

**Dependencies:** Current team and a configured Campaign Manager

## US-CONTRACT-004: Review Deployment History

**As a** team member\
**I want to** review previous Officer generations\
**So that** I can understand the team's contract deployment history

### Acceptance Criteria

#### Happy Path

- [ ] A team member can view previous Officer generations separately from the active suite.

#### Business Rules

- [ ] Previous generations are not presented as contracts currently used for team operations.

#### Edge & Error Cases

- [ ] An empty deployment history remains distinguishable from a failed history read.

**Priority:** P2 (High) · **Effort:** M · **Status:** 🚧 In Progress

**Dependencies:** Current team and the Officer-generation history read

## Implementation Evidence

- [Contract Management page](../../../app/src/views/team/%5Bid%5D/ContractManagementView.vue)
- [Current contract section](../../../app/src/components/sections/ContractManagementView/MainContractSection.vue)
- [Current contract actions](../../../app/src/components/sections/ContractManagementView/MainContractActions.vue)
- [Ownership transfer behaviour](../../../app/src/composables/contracts/useContractOwnershipTransfer.ts)
- [Contract-status behaviour](../../../app/src/composables/contracts/useContractStatusChange.ts)
- [Pending Board-action behaviour](../../../app/src/composables/contracts/usePendingBodActions.ts)
- [Campaign Management section](../../../app/src/components/sections/ContractManagementView/AdvertiseContractSection.vue)
- [Deployment history section](../../../app/src/components/sections/ContractManagementView/DeploymentHistorySection.vue)
- [Current contract action tests](../../../app/src/components/sections/ContractManagementView/__tests__/MainContractActions.spec.ts)

## Related Documentation

- [Contract feature documentation](../../contracts/features/README.md)
- [Product feature inventory](../README.md)
