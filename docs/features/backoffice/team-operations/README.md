# Backoffice Team Operations — User Stories

**Scope:** Read-only administrator oversight of platform teams, their current profile, Officer generations, contracts, and supported
on-chain balances from `/teams` and `/teams/:id`

**Last reviewed:** Not yet reviewed

These acceptance criteria follow the
[feature documentation review contract](../../../platform/feature-specification-guide.md#human-review-contract).

## Product Model

- **Team operations** is the administrator dashboard's read-only oversight capability. It does not create, edit, archive, delete, or change
  a team's membership; those workspace actions belong to [Companies and workspace](../../companies/README.md).
- Dashboard navigation requires an authenticated `ROLE_ADMIN` or `ROLE_SUPER_ADMIN` user. The list's backend authorization must enforce the
  same platform-wide boundary; its current omission is recorded in [#2602](https://github.com/globe-and-citizen/cnc-portal/issues/2602).
- The default platform list includes active teams only. It exposes a membership count, not the identities of individual team members, and it
  does not provide a control to include archived teams.
- An **Officer generation** is one deployed Officer for a team. The current generation is the head of its succession chain; older
  generations remain visible for operational history. Contracts not associated with an Officer generation are shown as shared,
  version-independent contracts.
- Balance views cover the native token and the supported stablecoins held by the supported value-holding contract types. The stablecoin
  total is an approximate dollar value; the native-token balance is displayed separately and is not priced into that total.

## Lifecycle

```mermaid
flowchart LR
    Admin[Administrator signs in] --> Guard{Administrator role?}
    Guard -->|No| Denied[Login or access denied]
    Guard -->|Yes| List[Open Team operations]
    List --> Overview[Review active-team and value overview]
    List --> Find[Filter, sort, or paginate teams]
    Find --> Team[Open a team]
    Team --> Profile[Review team profile]
    Team --> Generations[Review Officer generations]
    Generations --> Contracts[Inspect contracts, balances, and logs]
    List --> Refresh[Refresh platform list]
    Refresh --> List
```

## Status Overview

| User Story      | Title                                      | Actor                  | Status         |
| --------------- | ------------------------------------------ | ---------------------- | -------------- |
| US-TEAM-OPS-001 | Access and inspect platform teams          | Platform administrator | 🚧 In Progress |
| US-TEAM-OPS-002 | Inspect a team profile                     | Platform administrator | 🧪 Validation  |
| US-TEAM-OPS-003 | Investigate Officer contracts and balances | Platform administrator | 🧪 Validation  |

## US-TEAM-OPS-001: Access and Inspect Platform Teams

**As a** platform administrator\
**I want to** access and inspect the active teams across the platform\
**So that** I can identify the team that needs operational follow-up

### Acceptance Criteria

#### Happy Path

- [x] An authenticated administrator or super administrator can open Team operations and load the active platform team list.
- [x] The overview reports the number of listed teams, their combined membership count, the number with a current Officer, and the average
      members per listed team.
- [x] An administrator can inspect the supported on-chain value held by listed teams and the current versus legacy Officer-beacon summary.
- [x] An administrator can filter the list by team name, sort the available operational columns, paginate the filtered result, and open a
      selected team.

#### Business Rules

- [x] A visitor without a session is redirected to sign in, and an authenticated user without an administrator role is sent to access denied
      before using the dashboard journey.
- [x] The default platform list excludes archived teams.
- [x] The list exposes each team's membership count rather than individual member identities.
- [ ] The platform-wide team-list API independently restricts unfiltered results to administrator roles.
      ([#2602](https://github.com/globe-and-citizen/cnc-portal/issues/2602))

#### Edge & Error Cases

- [x] A failed team-list request is reported as a loading error instead of being presented as a successful refresh.
- [x] A platform with no active teams produces an empty list and zero-valued team summary.
- [x] An administrator can request a fresh platform list after an earlier load.

**Dependencies:** Dashboard authentication and administrator roles

## US-TEAM-OPS-002: Inspect a Team Profile

**As a** platform administrator\
**I want to** open a team and inspect its current identity and ownership\
**So that** I can establish the operational context before investigating its contracts

### Acceptance Criteria

#### Happy Path

- [x] An administrator can open a listed team and inspect its name, identifier, description when present, owner, creation date, and current
      Officer version when one exists.
- [x] An administrator can return from the team profile to the platform team list.

#### Business Rules

- [x] The team-detail API permits an administrator to inspect a team even when the administrator is not a member of that team.
- [x] The dashboard exposes no administrator controls for creating, editing, archiving, deleting, or changing a team's membership.

#### Edge & Error Cases

- [x] Loading a team profile displays a pending state until its details are available.
- [x] An unavailable or failed team-detail request reports that the team could not be loaded.

**Dependencies:** US-TEAM-OPS-001

## US-TEAM-OPS-003: Investigate Officer Contracts and Balances

**As a** platform administrator\
**I want to** inspect a team's Officer generations, contracts, balances, and event history\
**So that** I can investigate its deployed operational surface and held value

### Acceptance Criteria

#### Happy Path

- [x] An administrator can inspect the current and legacy Officer generations associated with a listed team.
- [x] An administrator can inspect contracts grouped by their Officer generation and separately identify shared, version-independent
      contracts.
- [x] Each displayed contract exposes its type, address, deployer, and event-log history.
- [x] Supported value-holding contracts expose their current native-token and supported-stablecoin balances, including an explicit zero when
      no supported balance is held.

#### Business Rules

- [x] A generation is identified as current only when it has no successor in that team's Officer sequence.
- [x] Contracts that do not hold supported value are not assigned a balance in the contract detail view.
- [x] Stablecoin totals remain an approximate dollar value, while native-token balances remain outside that dollar total.

#### Edge & Error Cases

- [x] A team with no deployed Officer contracts reports that no contracts are available rather than implying a deployment.
- [x] A failed Officer-generation request reports that contract versions could not be loaded.
- [x] A failed event-log request reports the retrieval failure instead of presenting an empty event history as successful.

**Dependencies:** US-TEAM-OPS-002 and available backend and chain data

## Known Gaps

- The backend's unfiltered platform team-list endpoint does not independently enforce the administrator-role boundary. This allows an
  authenticated non-administrator to request active platform-team data outside the dashboard route guard. Remediation is tracked in
  [#2602](https://github.com/globe-and-citizen/cnc-portal/issues/2602) (`US-TEAM-OPS-001`).

## Implementation Evidence

- [Dashboard navigation](../../../../dashboard/app/layouts/default.vue),
  [administrator route guard](../../../../dashboard/app/middleware/auth.global.ts), and
  [Team operations entry page](../../../../dashboard/app/pages/teams/index.vue)
- [Team list, filtering, sorting, pagination, and value overview](../../../../dashboard/app/components/teams/TeamsList.vue),
  [team list integration](../../../../dashboard/app/composables/useTeams.ts), and
  [supported balance recap](../../../../dashboard/app/composables/useTeamsBalanceRecaps.ts)
- [Team profile](../../../../dashboard/app/pages/teams/%5Bid%5D.vue),
  [Officer and contract grouping](../../../../dashboard/app/components/teams/TeamContractGroups.vue),
  [contract balances](../../../../dashboard/app/components/teams/ContractBalance.vue), and
  [contract logs](../../../../dashboard/app/components/teams/ContractLogs.vue)
- [Team routes](../../../../backend/src/routes/teamRoutes.ts), [team controller](../../../../backend/src/controllers/teamController.ts), and
  [team-controller coverage](../../../../backend/src/controllers/__tests__/teamController.test.ts)

## Related Documentation

- [Companies and workspace](../../companies/README.md)
- [Backoffice Feature Inventory](../README.md)
- [Product Feature Inventory](../../README.md)

_[← Back to feature inventory](../../README.md)_
