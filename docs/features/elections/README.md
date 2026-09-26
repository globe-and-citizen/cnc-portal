# Board Elections — User Stories

**Scope:** Board-election creation, voting, result publication, Board of Directors visibility, and election history in the client portal.
Board proposals are a separate journey and are outside this document's scope.

**Last reviewed:** Not yet reviewed

These acceptance criteria follow the
[feature documentation review contract](../../platform/feature-specification-guide.md#human-review-contract).

## Product Model

A Board election is an on-chain record created by the Elections contract owner for one company. The owner selects candidates and the number
of seats; the portal submits every current company member as an eligible voter. That voter list is fixed at creation time.

Eligible voters can cast one public on-chain vote for one candidate while the election is active. Results can be published after every
eligible voter has cast a vote or after the end time. Publication sets the election's winners and replaces the Board of Directors membership
on-chain.

Only one unpublished election can exist at a time. An ended election still blocks the next election until its results are published.

## Lifecycle

1. The company owner creates an election with candidates, a seat count, and a voting window.
2. The portal requests notifications for current company members.
3. Eligible voters review the active election and cast a vote.
4. The company follows the election status, dates, turnout, and candidate vote counts.
5. The owner publishes results once the election is ready.
6. The portal shows the elected Board and makes published elections available in history.

## Status Overview

| User Story | Title                                    | Actor          | Status         |
| ---------- | ---------------------------------------- | -------------- | -------------- |
| US-EL-01   | Create a board election                  | Company owner  | 🧪 Validation  |
| US-EL-02   | Cast a vote                              | Eligible voter | 🚧 In Progress |
| US-EL-03   | Publish election results                 | Company owner  | 🚧 In Progress |
| US-EL-04   | Receive an election-created notification | Company member | 🚧 In Progress |
| US-EL-05   | Follow the election schedule             | Company member | 🧪 Validation  |
| US-EL-06   | Follow election turnout and vote counts  | Company member | 🧪 Validation  |
| US-EL-07   | View the current Board of Directors      | Company member | 🧪 Validation  |
| US-EL-08   | Review a published election              | Company member | 🚧 In Progress |
| US-EL-09   | Receive a result-published notification  | Company member | 📝 Draft       |
| US-EL-10   | Understand voter eligibility             | Company member | 🚧 In Progress |
| US-EL-11   | Cancel an election                       | Company owner  | 📝 Draft       |

## Test Coverage Overview

Coverage targets compare each criterion's required evidence with direct `AC-US-*` references in tracked tests. They do not represent the
latest pass/fail result, which belongs to CI or the generated local report. The integrated main path exercises the production frontend,
owned backend, and local chain together. Mocked browser tests retain controlled rejection, failure, and archived-company variants.

| User Story | Main Journey  | Coverage Target | Gaps                               |
| ---------- | ------------- | --------------- | ---------------------------------- |
| US-EL-01   | ✅ Integrated | ✅ 14/14        | —                                  |
| US-EL-02   | ✅ Integrated | ⚠️ 8/9          | `AC-US-EL-02-08`                   |
| US-EL-03   | ✅ Integrated | ⚠️ 9/10         | `AC-US-EL-03-09`                   |
| US-EL-04   | ✅ Integrated | ⚠️ 6/7          | `AC-US-EL-04-06`                   |
| US-EL-05   | ✅ Frontend   | ✅ 6/6          | —                                  |
| US-EL-06   | ✅ Frontend   | ✅ 5/5          | —                                  |
| US-EL-07   | ✅ Integrated | ✅ 5/5          | —                                  |
| US-EL-08   | ✅ Integrated | ⚠️ 4/6          | `AC-US-EL-08-04`, `AC-US-EL-08-05` |
| US-EL-09   | 📋 Planned    | ❌ 0/4          | `AC-US-EL-09-01` through `-04`     |
| US-EL-10   | 📋 Planned    | ⚠️ 2/5          | `AC-US-EL-10-03` through `-05`     |
| US-EL-11   | 📋 Planned    | ❌ 0/5          | `AC-US-EL-11-01` through `-05`     |

## Proof Strategy Reference

Each acceptance criterion references one reusable strategy instead of repeating the same responsibility, evidence, and rationale text.

| Strategy               | Responsibilities              | Required Evidence         | Proof Rationale                                                                      |
| ---------------------- | ----------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `PS-FRONTEND`          | Frontend                      | Frontend                  | The frontend owns this deterministic validation, derivation, or interaction state.   |
| `PS-BROWSER`           | Frontend                      | Mocked browser            | The user interaction needs browser-level proof with controlled dependency outcomes.  |
| `PS-CHAIN`             | Frontend + Contract           | Integrated E2E            | The real wallet/chain hand-off and resulting user-visible state must work together.  |
| `PS-CONTRACT`          | Contract                      | Contract                  | The contract owns this authorization, lifecycle, or immutable-state rule.            |
| `PS-FRONTEND-CONTRACT` | Frontend + Contract           | Frontend + Contract       | Portal and contract rules can fail independently and both require direct proof.      |
| `PS-CHAIN-CONTRACT`    | Frontend + Contract           | Integrated E2E + Contract | The integrated wallet journey and focused on-chain invariant need independent proof. |
| `PS-BROWSER-CONTRACT`  | Frontend + Contract           | Mocked browser + Contract | A wallet journey and its resulting chain state must be observed together.            |
| `PS-BACKEND`           | Backend                       | Backend                   | The backend owns this API authorization or notification rule.                        |
| `PS-BROWSER-BACKEND`   | Frontend + Backend            | Mocked browser + Backend  | The portal hand-off and backend rule can fail independently.                         |
| `PS-FULL-JOURNEY`      | Frontend + Backend + Contract | Integrated E2E            | The portal, owned API, and chain result must work without replacing a CNC boundary.  |

## US-EL-01: Create a Board Election

**As a** company owner\
**I want to** create a board election with a voting window and candidates\
**So that** the company can elect its Board of Directors through an auditable process

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EL-01-01` A company owner can create an election with a title, description, start time, end time, seat count, and candidates.
- [x] `AC-US-EL-01-02` A successful creation makes the new election available as the company's current election.
- [x] `AC-US-EL-01-03` Current company members are submitted as the election's eligible voters.

#### Business Rules

- [x] `AC-US-EL-01-04` Only the Elections contract owner can create an election.
- [x] `AC-US-EL-01-05` The portal requires an odd seat count of at least three and at least that many distinct candidates before it submits
      an election.
- [x] `AC-US-EL-01-06` The start time must be in the future and the end time must be after the start time.
- [x] `AC-US-EL-01-07` The contract prevents a new election while the preceding election's results remain unpublished.
- [x] `AC-US-EL-01-10` The voting window must remain open for at least five minutes.
- [x] `AC-US-EL-01-11` The contract requires a positive odd seat count, at least as many candidates as seats, and no duplicate candidates.
- [x] `AC-US-EL-01-13` The portal requires a title of at least three characters and a description of at least ten characters.

#### Edge & Error Cases

- [x] `AC-US-EL-01-08` Cancelling the wallet signature does not create an election or request member notifications.
- [x] `AC-US-EL-01-09` A rejected creation preserves a recoverable error state in the creation flow.
- [x] `AC-US-EL-01-12` An archived company cannot create an election.
- [x] `AC-US-EL-01-14` Closing an untouched creation form does not create an election or request member notifications.

### Test Coverage

| Acceptance Criterion | Proof Strategy         | Current Evidence                                      | Status |
| -------------------- | ---------------------- | ----------------------------------------------------- | ------ |
| `AC-US-EL-01-01`     | `PS-CHAIN`             | Integrated E2E + Mocked browser + Frontend + Contract | ✅ Met |
| `AC-US-EL-01-02`     | `PS-CHAIN`             | Integrated E2E + Mocked browser + Contract            | ✅ Met |
| `AC-US-EL-01-03`     | `PS-CHAIN`             | Integrated E2E + Mocked browser + Frontend + Contract | ✅ Met |
| `AC-US-EL-01-04`     | `PS-CONTRACT`          | Contract                                              | ✅ Met |
| `AC-US-EL-01-05`     | `PS-FRONTEND`          | Frontend                                              | ✅ Met |
| `AC-US-EL-01-06`     | `PS-FRONTEND-CONTRACT` | Frontend + Contract                                   | ✅ Met |
| `AC-US-EL-01-07`     | `PS-FRONTEND-CONTRACT` | Frontend + Contract                                   | ✅ Met |
| `AC-US-EL-01-08`     | `PS-BROWSER`           | Mocked browser + Frontend                             | ✅ Met |
| `AC-US-EL-01-09`     | `PS-FRONTEND`          | Frontend                                              | ✅ Met |
| `AC-US-EL-01-10`     | `PS-FRONTEND`          | Frontend                                              | ✅ Met |
| `AC-US-EL-01-11`     | `PS-CONTRACT`          | Contract                                              | ✅ Met |
| `AC-US-EL-01-12`     | `PS-BROWSER`           | Mocked browser + Frontend                             | ✅ Met |
| `AC-US-EL-01-13`     | `PS-FRONTEND`          | Frontend                                              | ✅ Met |
| `AC-US-EL-01-14`     | `PS-FRONTEND`          | Frontend                                              | ✅ Met |

**Dependencies:** Current company, Elections contract, and connected company-owner wallet

## US-EL-02: Cast a Vote

**As an** eligible voter\
**I want to** select a candidate and cast one vote\
**So that** my preference contributes to the Board election

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EL-02-01` An eligible voter can review an election's candidates and cast a vote for one of them while the election is active.
- [x] `AC-US-EL-02-02` The Elections contract records the selected candidate, the voter's participation, and the candidate's vote count.

#### Business Rules

- [x] `AC-US-EL-02-03` A voter can cast at most one vote for an election.
- [x] `AC-US-EL-02-04` The contract accepts votes only from addresses in that election's fixed eligible-voter list.
- [x] `AC-US-EL-02-05` The contract rejects votes outside the election's active time window and votes for addresses that are not candidates.

#### Edge & Error Cases

- [x] `AC-US-EL-02-06` Rejecting the wallet signature does not record a vote.
- [x] `AC-US-EL-02-07` After a successful vote, the portal refreshes the voter's recorded choice and the election counts without requiring a
      manual reload.
- [ ] `AC-US-EL-02-08` A member who is not eligible receives an explanation in the portal before attempting a wallet signature.
- [x] `AC-US-EL-02-09` An archived company cannot cast a vote.

### Test Coverage

| Acceptance Criterion | Proof Strategy      | Current Evidence                           | Status     |
| -------------------- | ------------------- | ------------------------------------------ | ---------- |
| `AC-US-EL-02-01`     | `PS-CHAIN`          | Integrated E2E + Mocked browser            | ✅ Met     |
| `AC-US-EL-02-02`     | `PS-CHAIN-CONTRACT` | Integrated E2E + Mocked browser + Contract | ✅ Met     |
| `AC-US-EL-02-03`     | `PS-CONTRACT`       | Contract                                   | ✅ Met     |
| `AC-US-EL-02-04`     | `PS-CONTRACT`       | Contract                                   | ✅ Met     |
| `AC-US-EL-02-05`     | `PS-CONTRACT`       | Contract                                   | ✅ Met     |
| `AC-US-EL-02-06`     | `PS-BROWSER`        | Mocked browser                             | ✅ Met     |
| `AC-US-EL-02-07`     | `PS-CHAIN`          | Integrated E2E + Mocked browser + Frontend | ✅ Met     |
| `AC-US-EL-02-08`     | `PS-BROWSER`        | None linked                                | ❌ Missing |
| `AC-US-EL-02-09`     | `PS-BROWSER`        | Mocked browser                             | ✅ Met     |

**Dependencies:** US-EL-01

## US-EL-03: Publish Election Results

**As a** company owner\
**I want to** publish a completed election's results\
**So that** the elected members become the Board of Directors

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EL-03-01` The Elections contract owner can publish an election once every eligible voter has voted or its end time has passed.
- [x] `AC-US-EL-03-02` Publishing stores the election's winners and replaces the Board of Directors membership with those winners.
- [x] `AC-US-EL-03-03` The portal offers the publication action for an unpublished election whose voting period is complete.

#### Business Rules

- [x] `AC-US-EL-03-04` The contract ranks candidates by vote count and uses address order to resolve tied counts deterministically.
- [x] `AC-US-EL-03-05` Only the Elections contract owner can publish results.
- [x] `AC-US-EL-03-06` A published election permits creation of the next election.

#### Edge & Error Cases

- [x] `AC-US-EL-03-07` The contract rejects publication before the election is ready and rejects a second publication.
- [x] `AC-US-EL-03-08` Rejecting the wallet signature does not publish results or replace the Board.
- [ ] `AC-US-EL-03-09` An election with no votes leaves the existing Board unchanged rather than seating candidates solely through the
      tie-break rule.
- [x] `AC-US-EL-03-10` An archived company cannot publish election results.

### Test Coverage

| Acceptance Criterion | Proof Strategy         | Current Evidence                           | Status     |
| -------------------- | ---------------------- | ------------------------------------------ | ---------- |
| `AC-US-EL-03-01`     | `PS-CHAIN-CONTRACT`    | Integrated E2E + Contract                  | ✅ Met     |
| `AC-US-EL-03-02`     | `PS-CHAIN-CONTRACT`    | Integrated E2E + Mocked browser + Contract | ✅ Met     |
| `AC-US-EL-03-03`     | `PS-CHAIN`             | Integrated E2E + Frontend                  | ✅ Met     |
| `AC-US-EL-03-04`     | `PS-CONTRACT`          | Contract                                   | ✅ Met     |
| `AC-US-EL-03-05`     | `PS-FRONTEND-CONTRACT` | Frontend + Contract                        | ✅ Met     |
| `AC-US-EL-03-06`     | `PS-CHAIN-CONTRACT`    | Integrated E2E + Mocked browser + Contract | ✅ Met     |
| `AC-US-EL-03-07`     | `PS-CONTRACT`          | Contract                                   | ✅ Met     |
| `AC-US-EL-03-08`     | `PS-BROWSER`           | Mocked browser                             | ✅ Met     |
| `AC-US-EL-03-09`     | `PS-BROWSER-CONTRACT`  | None linked                                | ❌ Missing |
| `AC-US-EL-03-10`     | `PS-BROWSER`           | Mocked browser                             | ✅ Met     |

**Dependencies:** US-EL-02

## US-EL-04: Receive an Election-Created Notification

**As a** company member\
**I want to** receive a notification when a board election is created\
**So that** I can review the election in time to participate

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EL-04-01` After an election is created, every current company member receives a persisted election notification.
- [x] `AC-US-EL-04-02` An election notification routes a recipient to the company's board-election page.

#### Business Rules

- [x] `AC-US-EL-04-03` Creating the on-chain election and requesting notifications are separate operations.
- [x] `AC-US-EL-04-04` Only the company owner can request the election-created notification; the server refuses any other caller without
      reading the chain, because only the owner can create an election in the first place.

#### Edge & Error Cases

- [x] `AC-US-EL-04-05` A notification failure does not revert a successfully created on-chain election.
- [ ] `AC-US-EL-04-06` The notification tells each recipient whether they are eligible to vote, whether they are a candidate, and when the
      election ends.
- [x] `AC-US-EL-04-07` An archived company cannot request an election-created notification.

### Test Coverage

| Acceptance Criterion | Proof Strategy       | Current Evidence                                     | Status     |
| -------------------- | -------------------- | ---------------------------------------------------- | ---------- |
| `AC-US-EL-04-01`     | `PS-FULL-JOURNEY`    | Integrated E2E + Mocked browser + Frontend + Backend | ✅ Met     |
| `AC-US-EL-04-02`     | `PS-FULL-JOURNEY`    | Integrated E2E + Frontend                            | ✅ Met     |
| `AC-US-EL-04-03`     | `PS-BROWSER`         | Mocked browser + Frontend                            | ✅ Met     |
| `AC-US-EL-04-04`     | `PS-BACKEND`         | Backend                                              | ✅ Met     |
| `AC-US-EL-04-05`     | `PS-FRONTEND`        | Frontend                                             | ✅ Met     |
| `AC-US-EL-04-06`     | `PS-BROWSER-BACKEND` | None linked                                          | ❌ Missing |
| `AC-US-EL-04-07`     | `PS-BACKEND`         | Backend                                              | ✅ Met     |

**Dependencies:** US-EL-01 and the notification service

## US-EL-05: Follow the Election Schedule

**As a** company member\
**I want to** see an election's current status and time boundaries\
**So that** I know whether voting is upcoming, active, or complete

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EL-05-01` The portal shows Upcoming, Active, and Completed election states.
- [x] `AC-US-EL-05-02` The portal shows the election's start and end times.
- [x] `AC-US-EL-05-03` Upcoming and active elections show a countdown based on the relevant time boundary.

#### Business Rules

- [x] `AC-US-EL-05-04` A completed election remains distinct from one whose results have been published.
- [x] `AC-US-EL-05-05` Election status is calculated from the current election data and current time.

#### Edge & Error Cases

- [x] `AC-US-EL-05-06` When election data is unavailable, the status component does not present it as a valid active election.

### Test Coverage

| Acceptance Criterion | Proof Strategy | Current Evidence | Status |
| -------------------- | -------------- | ---------------- | ------ |
| `AC-US-EL-05-01`     | `PS-FRONTEND`  | Frontend         | ✅ Met |
| `AC-US-EL-05-02`     | `PS-FRONTEND`  | Frontend         | ✅ Met |
| `AC-US-EL-05-03`     | `PS-FRONTEND`  | Frontend         | ✅ Met |
| `AC-US-EL-05-04`     | `PS-FRONTEND`  | Frontend         | ✅ Met |
| `AC-US-EL-05-05`     | `PS-FRONTEND`  | Frontend         | ✅ Met |
| `AC-US-EL-05-06`     | `PS-FRONTEND`  | Frontend         | ✅ Met |

**Dependencies:** US-EL-01

## US-EL-06: Follow Election Turnout and Vote Counts

**As a** company member\
**I want to** see turnout and candidate vote counts\
**So that** I can follow the progress of the election

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EL-06-01` The portal displays the number of votes cast and the number of eligible voters for the current election.
- [x] `AC-US-EL-06-02` The portal displays each candidate's current vote count.

#### Business Rules

- [x] `AC-US-EL-06-03` Candidate counts remain attributable to the election being viewed.
- [x] `AC-US-EL-06-04` The portal distinguishes provisional vote counts from published winners until results are published.

#### Edge & Error Cases

- [x] `AC-US-EL-06-05` Election pages keep their contract-read and rendering work bounded as the number of candidates grows.

### Test Coverage

| Acceptance Criterion | Proof Strategy | Current Evidence | Status |
| -------------------- | -------------- | ---------------- | ------ |
| `AC-US-EL-06-01`     | `PS-FRONTEND`  | Frontend         | ✅ Met |
| `AC-US-EL-06-02`     | `PS-FRONTEND`  | Frontend         | ✅ Met |
| `AC-US-EL-06-03`     | `PS-FRONTEND`  | Frontend         | ✅ Met |
| `AC-US-EL-06-04`     | `PS-FRONTEND`  | Frontend         | ✅ Met |
| `AC-US-EL-06-05`     | `PS-FRONTEND`  | Frontend         | ✅ Met |

**Dependencies:** US-EL-02

## US-EL-07: View the Current Board of Directors

**As a** company member\
**I want to** view the current Board of Directors\
**So that** I know who currently represents the company

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EL-07-01` The election area shows the members of the current Board of Directors.
- [x] `AC-US-EL-07-02` A published election can show the Board it elected separately from the current Board.

#### Business Rules

- [x] `AC-US-EL-07-03` Board membership is read from the Board of Directors contract.

#### Edge & Error Cases

- [x] `AC-US-EL-07-04` An empty Board state is presented as no current Board rather than as a successful populated Board.
- [x] `AC-US-EL-07-05` The current Board still loads after a full page reload, once the company's contracts are known.

### Test Coverage

| Acceptance Criterion | Proof Strategy | Current Evidence          | Status |
| -------------------- | -------------- | ------------------------- | ------ |
| `AC-US-EL-07-01`     | `PS-CHAIN`     | Integrated E2E + Frontend | ✅ Met |
| `AC-US-EL-07-02`     | `PS-BROWSER`   | Mocked browser + Frontend | ✅ Met |
| `AC-US-EL-07-03`     | `PS-CHAIN`     | Integrated E2E + Frontend | ✅ Met |
| `AC-US-EL-07-04`     | `PS-FRONTEND`  | Frontend                  | ✅ Met |
| `AC-US-EL-07-05`     | `PS-CHAIN`     | Integrated E2E + Frontend | ✅ Met |

**Dependencies:** US-EL-03 and the Board of Directors contract

## US-EL-08: Review a Published Election

**As a** company member\
**I want to** open a published election and inspect its result\
**So that** I can understand how a Board was selected

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EL-08-01` The portal lists published elections and links each entry to its election details.
- [x] `AC-US-EL-08-02` An election detail view reads the selected election's configuration and result.

#### Business Rules

- [x] `AC-US-EL-08-03` Only elections with published results are shown as past elections.

#### Edge & Error Cases

- [ ] `AC-US-EL-08-04` Every published election remains reachable regardless of its age and individual detail-read failures.
- [ ] `AC-US-EL-08-05` An empty past-election list remains distinguishable from a failed, partially failed, or loading history read.
- [x] `AC-US-EL-08-06` The past-election list still loads after a full page reload, once the company's contracts are known.

### Test Coverage

| Acceptance Criterion | Proof Strategy | Current Evidence                           | Status     |
| -------------------- | -------------- | ------------------------------------------ | ---------- |
| `AC-US-EL-08-01`     | `PS-CHAIN`     | Integrated E2E + Mocked browser + Frontend | ✅ Met     |
| `AC-US-EL-08-02`     | `PS-CHAIN`     | Integrated E2E + Mocked browser + Frontend | ✅ Met     |
| `AC-US-EL-08-03`     | `PS-FRONTEND`  | Frontend                                   | ✅ Met     |
| `AC-US-EL-08-04`     | `PS-FRONTEND`  | None linked                                | ❌ Missing |
| `AC-US-EL-08-05`     | `PS-FRONTEND`  | None linked                                | ❌ Missing |
| `AC-US-EL-08-06`     | `PS-CHAIN`     | Integrated E2E + Frontend                  | ✅ Met     |

**Dependencies:** US-EL-03

## US-EL-09: Receive a Result-Published Notification

**As a** company member\
**I want to** receive a notification when election results are published\
**So that** I can learn who now represents the company without polling the election page

### Acceptance Criteria

#### Happy Path

- [ ] `AC-US-EL-09-01` Publishing results notifies current company members that a new Board of Directors is in place.
- [ ] `AC-US-EL-09-02` The notification links recipients to the published election result.

#### Business Rules

- [ ] `AC-US-EL-09-03` The notification identifies the elected members without treating a provisional result as published.

#### Edge & Error Cases

- [ ] `AC-US-EL-09-04` A notification failure does not roll back a successful result publication and is reported to the publisher.

### Test Coverage

| Acceptance Criterion | Proof Strategy       | Current Evidence | Status     |
| -------------------- | -------------------- | ---------------- | ---------- |
| `AC-US-EL-09-01`     | `PS-FULL-JOURNEY`    | None linked      | ❌ Missing |
| `AC-US-EL-09-02`     | `PS-FULL-JOURNEY`    | None linked      | ❌ Missing |
| `AC-US-EL-09-03`     | `PS-BROWSER-BACKEND` | None linked      | ❌ Missing |
| `AC-US-EL-09-04`     | `PS-BROWSER-BACKEND` | None linked      | ❌ Missing |

**Dependencies:** US-EL-03 and the notification service

## US-EL-10: Understand Voter Eligibility

**As a** company member\
**I want to** understand whether I can vote in an election\
**So that** I know how my membership affects participation

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EL-10-01` The Elections contract stores the eligible-voter list submitted when the election is created.

#### Business Rules

- [x] `AC-US-EL-10-02` Joining or leaving the company after creation does not change that election's eligible-voter list.
- [ ] `AC-US-EL-10-03` The portal shows a member whether they are eligible for the election before they attempt to vote.

#### Edge & Error Cases

- [ ] `AC-US-EL-10-04` The portal explains why a later-joined member cannot vote in an existing election.
- [ ] `AC-US-EL-10-05` The portal makes the fixed eligible-voter list reviewable after the election has been published.

### Test Coverage

| Acceptance Criterion | Proof Strategy        | Current Evidence | Status     |
| -------------------- | --------------------- | ---------------- | ---------- |
| `AC-US-EL-10-01`     | `PS-CONTRACT`         | Contract         | ✅ Met     |
| `AC-US-EL-10-02`     | `PS-CONTRACT`         | Contract         | ✅ Met     |
| `AC-US-EL-10-03`     | `PS-BROWSER`          | None linked      | ❌ Missing |
| `AC-US-EL-10-04`     | `PS-BROWSER`          | None linked      | ❌ Missing |
| `AC-US-EL-10-05`     | `PS-BROWSER-CONTRACT` | None linked      | ❌ Missing |

**Dependencies:** US-EL-01

## US-EL-11: Cancel an Election

**As a** company owner\
**I want to** cancel an election created in error\
**So that** the company can correct its election without waiting for an unintended process to finish

### Acceptance Criteria

#### Happy Path

- [ ] `AC-US-EL-11-01` The owner can cancel one current election without cancelling unrelated election history.
- [ ] `AC-US-EL-11-02` A cancelled election remains auditable with its cancellation state.

#### Business Rules

- [ ] `AC-US-EL-11-03` A cancelled election cannot accept votes or publish results.
- [ ] `AC-US-EL-11-04` Cancelling the election permits creation of a replacement election.

#### Edge & Error Cases

- [ ] `AC-US-EL-11-05` A rejected cancellation does not change the election state.

### Test Coverage

| Acceptance Criterion | Proof Strategy        | Current Evidence | Status     |
| -------------------- | --------------------- | ---------------- | ---------- |
| `AC-US-EL-11-01`     | `PS-BROWSER-CONTRACT` | None linked      | ❌ Missing |
| `AC-US-EL-11-02`     | `PS-BROWSER-CONTRACT` | None linked      | ❌ Missing |
| `AC-US-EL-11-03`     | `PS-CONTRACT`         | None linked      | ❌ Missing |
| `AC-US-EL-11-04`     | `PS-BROWSER-CONTRACT` | None linked      | ❌ Missing |
| `AC-US-EL-11-05`     | `PS-BROWSER`          | None linked      | ❌ Missing |

**Dependencies:** US-EL-01 and a future contract decision

## Implementation Evidence

**Implementation evidence reviewed against:** `3b281c49e016affa8af91143bfcc22b1fb624e36`

- [Election overview page](../../../app/src/views/team/%5Bid%5D/BodElectionView.vue)
- [Election detail page](../../../app/src/views/team/%5Bid%5D/BodElectionDetailsView.vue)
- [Election creation workflow](../../../app/src/components/sections/AdministrationView/ElectionSummarySection.vue)
- [Election creation form](../../../app/src/components/sections/AdministrationView/forms/CreateElectionForm.vue)
- [Election action guards](../../../app/src/components/sections/AdministrationView/ElectionActions.vue)
- [Election result publication action](../../../app/src/components/sections/AdministrationView/PublishResult.vue)
- [Election reads](../../../app/src/composables/elections/reads.ts), [writes](../../../app/src/composables/elections/writes.ts), and
  [history assembly](../../../app/src/composables/elections/history.ts)
- [Election decoding helpers](../../../app/src/utils/elections/election.ts)
- [Candidate section](../../../app/src/components/sections/AdministrationView/ElectionCandidatesSection.vue),
  [election statistics](../../../app/src/components/sections/AdministrationView/ElectionStats.vue),
  [current Board](../../../app/src/components/sections/AdministrationView/BodMembersSection.vue), and
  [past elections](../../../app/src/components/sections/AdministrationView/PastElectionsSection.vue)
- [Election page and presentation regression tests](../../../app/src/views/team/%5Bid%5D/__tests__/BodElectionView.spec.ts),
  [candidate presentation tests](../../../app/src/components/sections/AdministrationView/__tests__/ElectionCandidateIdentity.spec.ts), and
  [statistics-card presentation tests](../../../app/src/components/sections/AdministrationView/__tests__/ElectionStatsCard.spec.ts)
- [Current Elections contract](../../../contract/contracts/Elections/Elections.sol)
- [Elections contract tests](../../../contract/test/Elections.spec.ts)
- [Board Elections integrated lifecycle test](../../../app/test/e2e/elections/elections.integrated.spec.ts)
- [Board Elections browser acceptance tests](../../../app/test/e2e/elections/elections.spec.ts)
- [Election notification API route](../../../backend/src/routes/electionsRoute.ts)
- [Election notification API controller](../../../backend/src/controllers/electionsController.ts)
- [Election notification API tests](../../../backend/src/controllers/__tests__/electionsController.test.ts)

## Related Documentation

- [Client Navigation implementation](../../implementation/client-navigation/README.md)
- [Elections contract behaviour](../../contracts/features/elections/README.md)
- [Board of Directors contract behaviour](../../contracts/features/board-of-directors/README.md)
- [Product feature inventory](../README.md)

## Known Gaps

- The current contract deterministically seats candidates when an election with zero votes is published; it does not preserve the existing
  Board (US-EL-03).
- Result publication does not currently request company-member notifications (US-EL-09).
- The eligible-voter list is a creation-time snapshot, but the portal does not yet explain ineligibility or expose that list for review
  (US-EL-10).
- The current contract exposes a contract-wide pause, not a per-election cancellation flow, and the portal does not expose an election
  cancellation action (US-EL-11).
- A failed past-election detail read is logged and omitted from the archive. If every detail read fails, the resulting empty list is
  indistinguishable from a company with no published elections (US-EL-08).

_[← Back to feature inventory](../README.md)_
