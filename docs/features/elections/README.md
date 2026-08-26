# Board Elections — User Stories

**Scope:** Board-election creation, voting, result publication, Board of Directors visibility, and election history in the client portal.
Board proposals are a separate journey and are outside this document's scope.

**Last reviewed:** Not yet reviewed

These acceptance criteria follow the
[feature documentation review contract](../../platform/feature-specification-guide.md#human-review-contract).

## Product Model

A Board election is an on-chain record created by the Elections contract owner for one team. The owner selects candidates and the number of
seats; the portal submits every current team member as an eligible voter. That voter list is fixed at creation time.

Eligible voters can cast one public on-chain vote for one candidate while the election is active. Results can be published after every
eligible voter has cast a vote or after the end time. Publication sets the election's winners and replaces the Board of Directors membership
on-chain.

Only one unpublished election can exist at a time. An ended election still blocks the next election until its results are published.

## Lifecycle

1. The team owner creates an election with candidates, a seat count, and a voting window.
2. The portal requests notifications for current team members.
3. Eligible voters review the active election and cast a vote.
4. The team follows the election status, dates, turnout, and candidate vote counts.
5. The owner publishes results once the election is ready.
6. The portal shows the elected Board and makes published elections available in history.

## Status Overview

| User Story | Title                                    | Actor          | Status         |
| ---------- | ---------------------------------------- | -------------- | -------------- |
| US-EL-01   | Create a board election                  | Team owner     | 🧪 Validation  |
| US-EL-02   | Cast a vote                              | Eligible voter | 🚧 In Progress |
| US-EL-03   | Publish election results                 | Team owner     | 🚧 In Progress |
| US-EL-04   | Receive an election-created notification | Team member    | 🚧 In Progress |
| US-EL-05   | Follow the election schedule             | Team member    | 🧪 Validation  |
| US-EL-06   | Follow election turnout and vote counts  | Team member    | 🚧 In Progress |
| US-EL-07   | View the current Board of Directors      | Team member    | 🧪 Validation  |
| US-EL-08   | Review a published election              | Team member    | 🚧 In Progress |
| US-EL-09   | Receive a result-published notification  | Team member    | 📝 Draft       |
| US-EL-10   | Understand voter eligibility             | Team member    | 🚧 In Progress |
| US-EL-11   | Cancel an election                       | Team owner     | 📝 Draft       |

## US-EL-01: Create a Board Election

**As a** team owner\
**I want to** create a board election with a voting window and candidates\
**So that** the team can elect its Board of Directors through an auditable process

### Acceptance Criteria

#### Happy Path

- [x] A team owner can create an election with a title, description, start time, end time, seat count, and candidates.
- [x] A successful creation makes the new election available as the team's current election.
- [x] Current team members are submitted as the election's eligible voters.

#### Business Rules

- [x] Only the Elections contract owner can create an election.
- [x] The seat count must be a non-zero odd number, and the candidate list must contain at least that many distinct candidates.
- [x] The start time must be in the future and the end time must be after the start time.
- [x] The contract prevents a new election while the preceding election's results remain unpublished.

#### Edge & Error Cases

- [x] Cancelling the wallet signature or closing the form does not create an election.
- [x] A rejected creation preserves a recoverable error state in the creation flow.

**Dependencies:** Current team, Elections contract, and connected team-owner wallet

## US-EL-02: Cast a Vote

**As an** eligible voter\
**I want to** select a candidate and cast one vote\
**So that** my preference contributes to the Board election

### Acceptance Criteria

#### Happy Path

- [x] An eligible voter can review an election's candidates and cast a vote for one of them while the election is active.
- [x] The Elections contract records the selected candidate, the voter's participation, and the candidate's vote count.

#### Business Rules

- [x] A voter can cast at most one vote for an election.
- [x] The contract accepts votes only from addresses in that election's fixed eligible-voter list.
- [x] The contract rejects votes outside the election's active time window and votes for addresses that are not candidates.

#### Edge & Error Cases

- [x] Rejecting the wallet signature does not record a vote.
- [ ] After a successful vote, the portal refreshes the voter's recorded choice and the election counts without requiring a manual reload.
- [ ] A member who is not eligible receives an explanation in the portal before attempting a wallet signature.

**Dependencies:** US-EL-01

## US-EL-03: Publish Election Results

**As a** team owner\
**I want to** publish a completed election's results\
**So that** the elected members become the Board of Directors

### Acceptance Criteria

#### Happy Path

- [x] The Elections contract owner can publish an election once every eligible voter has voted or its end time has passed.
- [x] Publishing stores the election's winners and replaces the Board of Directors membership with those winners.
- [x] The portal offers the publication action for an unpublished election whose voting period is complete.

#### Business Rules

- [x] The contract ranks candidates by vote count and uses address order to resolve tied counts deterministically.
- [x] Only the Elections contract owner can publish results.
- [x] A published election permits creation of the next election.

#### Edge & Error Cases

- [x] The contract rejects publication before the election is ready and rejects a second publication.
- [x] Rejecting the wallet signature does not publish results or replace the Board.
- [ ] An election with no votes leaves the existing Board unchanged rather than seating candidates solely through the tie-break rule.

**Dependencies:** US-EL-02

## US-EL-04: Receive an Election-Created Notification

**As a** team member\
**I want to** receive a notification when a board election is created\
**So that** I can review the election in time to participate

### Acceptance Criteria

#### Happy Path

- [x] After an election is created, the portal requests notifications for the team's current members.
- [x] An election notification routes a recipient to the team's board-election page.

#### Business Rules

- [x] Creating the on-chain election and requesting notifications are separate operations.

#### Edge & Error Cases

- [x] A notification failure does not revert a successfully created on-chain election.
- [ ] The notification tells each recipient whether they are eligible to vote, whether they are a candidate, and when the election ends.

**Dependencies:** US-EL-01 and the notification service

## US-EL-05: Follow the Election Schedule

**As a** team member\
**I want to** see an election's current status and time boundaries\
**So that** I know whether voting is upcoming, active, or complete

### Acceptance Criteria

#### Happy Path

- [x] The portal shows Upcoming, Active, and Completed election states.
- [x] The portal shows the election's start and end times.
- [x] Upcoming and active elections show a countdown based on the relevant time boundary.

#### Business Rules

- [x] A completed election remains distinct from one whose results have been published.
- [x] Election status is calculated from the current election data and current time.

#### Edge & Error Cases

- [x] When election data is unavailable, the status component does not present it as a valid active election.

**Dependencies:** US-EL-01

## US-EL-06: Follow Election Turnout and Vote Counts

**As a** team member\
**I want to** see turnout and candidate vote counts\
**So that** I can follow the progress of the election

### Acceptance Criteria

#### Happy Path

- [x] The portal displays the number of votes cast and the number of eligible voters for the current election.
- [x] The portal displays each candidate's current vote count.

#### Business Rules

- [x] Candidate counts remain attributable to the election being viewed.
- [ ] The portal distinguishes provisional vote counts from published winners until results are published.

#### Edge & Error Cases

- [ ] Election pages keep their contract-read and rendering work bounded as the number of candidates grows.

**Dependencies:** US-EL-02

## US-EL-07: View the Current Board of Directors

**As a** team member\
**I want to** view the current Board of Directors\
**So that** I know who currently represents the team

### Acceptance Criteria

#### Happy Path

- [x] The election area shows the members of the current Board of Directors.
- [x] A published election can show the Board it elected separately from the current Board.

#### Business Rules

- [x] Board membership is read from the Board of Directors contract.

#### Edge & Error Cases

- [x] An empty Board state is presented as no current Board rather than as a successful populated Board.

**Dependencies:** US-EL-03 and the Board of Directors contract

## US-EL-08: Review a Published Election

**As a** team member\
**I want to** open a published election and inspect its result\
**So that** I can understand how a Board was selected

### Acceptance Criteria

#### Happy Path

- [x] The portal lists published elections and links each entry to its election details.
- [x] An election detail view reads the selected election's configuration and result.

#### Business Rules

- [x] Only elections with published results are shown as past elections.

#### Edge & Error Cases

- [ ] Every published election remains reachable regardless of its age.
- [x] An empty past-election list remains distinguishable from a failed or loading history read.

**Dependencies:** US-EL-03

## US-EL-09: Receive a Result-Published Notification

**As a** team member\
**I want to** receive a notification when election results are published\
**So that** I can learn who now represents the team without polling the election page

### Acceptance Criteria

#### Happy Path

- [ ] Publishing results notifies current team members that a new Board of Directors is in place.
- [ ] The notification links recipients to the published election result.

#### Business Rules

- [ ] The notification identifies the elected members without treating a provisional result as published.

#### Edge & Error Cases

- [ ] A notification failure does not roll back a successful result publication and is reported to the publisher.

**Dependencies:** US-EL-03 and the notification service

## US-EL-10: Understand Voter Eligibility

**As a** team member\
**I want to** understand whether I can vote in an election\
**So that** I know how my membership affects participation

### Acceptance Criteria

#### Happy Path

- [x] The Elections contract stores the eligible-voter list submitted when the election is created.

#### Business Rules

- [x] Joining or leaving the team after creation does not change that election's eligible-voter list.
- [ ] The portal shows a member whether they are eligible for the election before they attempt to vote.

#### Edge & Error Cases

- [ ] The portal explains why a later-joined member cannot vote in an existing election.
- [ ] The portal makes the fixed eligible-voter list reviewable after the election has been published.

**Dependencies:** US-EL-01

## US-EL-11: Cancel an Election

**As a** team owner\
**I want to** cancel an election created in error\
**So that** the team can correct its election without waiting for an unintended process to finish

### Acceptance Criteria

#### Happy Path

- [ ] The owner can cancel one current election without cancelling unrelated election history.
- [ ] A cancelled election remains auditable with its cancellation state.

#### Business Rules

- [ ] A cancelled election cannot accept votes or publish results.
- [ ] Cancelling the election permits creation of a replacement election.

#### Edge & Error Cases

- [ ] A rejected cancellation does not change the election state.

**Dependencies:** US-EL-01 and a future contract decision

## Implementation Evidence

- [Board-election routes](../../../app/src/router/index.ts) and
  [Administration navigation](../../../app/src/composables/useSidebarNavItems.ts). The new Payment Gate routes and navigation entry do not
  alter Election entry points.
- [Election overview page](../../../app/src/views/team/%5Bid%5D/BodElectionView.vue)
- [Election detail page](../../../app/src/views/team/%5Bid%5D/BodElectionDetailsView.vue)
- [Election creation workflow](../../../app/src/components/sections/AdministrationView/CurrentBoDElectionSection.vue)
- [Election creation form](../../../app/src/components/sections/AdministrationView/forms/CreateElectionForm.vue)
- [Election action guards](../../../app/src/components/sections/AdministrationView/ElectionActions.vue)
- [Election reads and writes](../../../app/src/composables/elections/)
- [Current and past election sections](../../../app/src/components/sections/AdministrationView/)
- [Current Elections contract](../../../contract/contracts/Elections/Elections.sol)
- [Elections contract tests](../../../contract/test/Elections.spec.ts)
- [Election composable tests](../../../app/src/composables/elections/__tests__/reads.spec.ts)
- [Election component tests](../../../app/src/components/sections/AdministrationView/__tests__/)

## Related Documentation

- [Elections contract behaviour](../../contracts/features/elections/README.md)
- [Board of Directors contract behaviour](../../contracts/features/board-of-directors/README.md)
- [Product feature inventory](../README.md)

## Known Gaps

- The current contract deterministically seats candidates when an election with zero votes is published; it does not preserve the existing
  Board (US-EL-03).
- Result publication does not currently request team-member notifications (US-EL-09).
- The eligible-voter list is a creation-time snapshot, but the portal does not yet explain ineligibility or expose that list for review
  (US-EL-10).
- The portal supports only the most recent portion of election history rather than an unbounded published-election archive (US-EL-08).
- The current contract exposes a contract-wide pause, not a per-election cancellation flow, and the portal does not expose an election
  cancellation action (US-EL-11).

_[← Back to feature inventory](../README.md)_
