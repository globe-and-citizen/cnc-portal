# Board of Directors Elections — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL) **Last updated:** 2026-08-20 **Issue:** #1415 — _[Perf] Review Election feature_

The feature is three actions: the owner **creates** a ballot, members **vote**, the owner
**publishes** the result and the winners become the Board of Directors. Every other story below
supports one of those three.

### Lifecycle (test in this order)

1. Owner **creates** an election — title, seats, dates, candidates (US-EL-01).
2. Every team member is **notified** (US-EL-04).
3. Eligible members **cast one vote** while the ballot is open (US-EL-02).
4. Anyone **follows** the status, the countdown and the standings (US-EL-05).
5. The ballot ends — closing time reached, **or** everyone eligible has voted.
6. Owner **publishes** — the winners replace the Board of Directors (US-EL-03, US-EL-06).
7. The ballot joins the archive, auditable by anyone (US-EL-07).

### Where to test

| Page                 | Route                                             | What it holds                                                                |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Elections**        | `/teams/:id/administration/bod-elections`         | Current board, current election summary, past elections, contract owner card |
| **Election details** | `/teams/:id/administration/bod-elections-details` | Candidate cards, voting, publishing, elected board                           |

Reaching them: sidebar → Administration → Board of Directors, the dashboard's company overview card,
or the "New Election Created" notification.

### Actors

- **Owner** — deployed the team's contracts. The only one who can create and publish. Not the board.
- **Voter** — a team member on the roster at creation time. Candidates vote too, if on the roll.
- **Candidate** — a member the owner put forward.
- **Member** — anyone in the team, on the roll or not; everyone can read the ballot and the board.

### Facts that are often misread

- **Publishing is owner-only** — `publishResults` is `onlyOwner`.
- **"One election at a time" is stricter than it sounds.** A new ballot is refused until the
  previous one's results are **published**, not merely until it ends. An expired, unpublished ballot
  blocks the team indefinitely — that is what US-EL-03 has to solve.
- **Voters are not chosen.** The owner picks candidates; the roll is every current team member at
  creation time, frozen there.
- **The board is seated by the contract.** Publishing writes the winners straight into the
  BoardOfDirectors contract, replacing the previous board wholesale.
- **A ballot can finish early** — closing time passed _or_ every eligible voter has voted.

The contract document ([`../contracts/elections/README.md`](../contracts/elections/README.md)) is the
authority on what the chain does; this one on what people can do.

---

## Status Overview

| Story    | As a…      | I want to…                                     | Status | Priority | Effort |
| -------- | ---------- | ---------------------------------------------- | :----: | :------: | ------ |
| US-EL-01 | Owner      | Create an election                             |   ✅   |    P1    | M      |
| US-EL-02 | Voter      | Cast my vote and see that it counted           |   ⚠️   |    P1    | M      |
| US-EL-03 | Owner      | Publish the results and seat the board         |   ⚠️   |    P1    | M      |
| US-EL-04 | Member     | Be told a ballot concerns me, and how it ended |   ⚠️   |    P2    | S      |
| US-EL-05 | Member     | Follow the ballot while it runs                |   ⚠️   |    P2    | M      |
| US-EL-06 | Member     | Know who sits on the board today               |   ✅   |    P2    | S      |
| US-EL-07 | Member     | Audit a past election                          |   ⚠️   |    P2    | M      |
| US-EL-08 | New member | Take part although I joined late               |   ❌   |    P2    | L      |
| US-EL-09 | Owner      | Call off a ballot opened by mistake            |   🚫   |    P3    | M      |

✅ works · ⚠️ works with known defects · ❌ not built · 🚫 contract supports it, no UI

> Criteria tagged _(chain)_ are contract behaviour a tester cannot always trigger from the screen —
> check them against the contract test suite. Criteria tagged _(API)_ are server responses — verify
> with the Bruno collection in `backend/bruno/CNCPortal`. Criteria carrying a defect id — _(E-07)_ —
> state what the feature **should** do; the tag says which ones are expected to fail today. See
> [Defects](#defects-issue-1415).

---

## Definition of Done (applies to every story)

- **DoD-1 — Nothing is silently unavailable.** Every disabled control says why on hover: not the
  owner, team archived, ballot not open yet, ballot closed, already voted, not on the roll.
- **DoD-2 — Every refusal is in ordinary language.** Every contract error is translated: not found,
  not active, still ongoing, already voted, not eligible, already published, not ready, even seat
  count, invalid dates, invalid candidate, too few or duplicate candidates, empty or duplicate
  voters, not the owner. A wallet rejection shows nothing. Creation errors appear in the modal,
  voting and publishing errors as toasts. One failure produces **one** message _(E-10)_.
- **DoD-3 — The page states its condition.** Loading, empty and error states look different from one
  another; an empty section says it is empty instead of pulsing _(E-12)_.
- **DoD-4 — Both themes, and a phone.** No fixed light-mode colours _(E-18)_; grids reflow to one
  column.
- **DoD-5 — Archived teams are read-only.** Every write is blocked with the archived tooltip.

---

## US-EL-01 — Create an election

**As a** team owner **I want to** open a ballot with the candidates and seats I choose **So that**
the board holds its mandate from a vote the whole team can check afterwards

**Acceptance Criteria — the form:**

- [ ] "Create Election" on the Elections page opens a modal titled "Create election"
- [ ] Title is 3 characters or more, description 10 or more
- [ ] The seat count must be odd, and the field says so up front — "An odd number — 3, 5, 7 …"
      _(E-16: the form still refuses fewer than 3, the chain accepts any odd number from 1)_
- [ ] Opening takes **a day and a time**, or is left blank for "a couple of minutes from now"
- [ ] Closing takes **a day and a time**; an untouched time runs to the end of that day
- [ ] A closing before the opening, or too soon after it, is refused in the form with a message
      saying how long a ballot must last
- [ ] Candidates come from the team roster: at least as many as there are seats ("At least N
      candidates are required."), never twice the same ("Duplicate candidates are not allowed.")
- [ ] **The form says who will be allowed to vote** — every current team member, not a choice _(gap:
      the roll is filled silently and no screen ever shows it)_

**Acceptance Criteria — the ballot created:**

- [ ] It opens and closes at the moments picked; nothing is rewritten on the way to the chain
- [ ] The opening is computed at submit, not when the modal opened — a form left open ten minutes
      still produces a valid ballot
- [ ] Every current team member is registered as an eligible voter
- [ ] On success: toast "Election created successfully!", modal closes, the new ballot is current
- [ ] While a previous ballot is unpublished, "Create Election" is not offered — and _(chain)_
      forcing the call is refused with "A previous election is still ongoing"
- [ ] Only the owner can create; for anyone else the button is disabled and says why (DoD-1)
- [ ] _(chain)_ Refused: even or zero seats, closing not after opening, opening not in the future,
      fewer candidates than seats, duplicate candidates, duplicate or empty voters

**Priority:** P1 · **Effort:** M · **Status:** ✅ End to end; E-16 and the invisible roll remain ·
**Dependencies:** US-TEAM-001

---

## US-EL-02 — Cast my vote and see that it counted

**As an** eligible voter **I want to** see who is standing, vote once, and get immediate
confirmation **So that** my vote is a decision and not a guess, and I never wonder whether it went
through

**Acceptance Criteria — the candidates:**

- [ ] Every candidate is listed with name, role in the team, wallet address and avatar
- [ ] The list is that ballot's own candidates, whichever ballot was opened — a past one included
- [ ] A candidate who left the team renders as "Unknown / Candidate" instead of breaking the card
- [ ] The ballot's title and description are visible on the page where the vote happens, not only on
      the summary page

**Acceptance Criteria — the vote:**

- [ ] "Cast a Vote" is offered only while the ballot is open — not before, not after, never on an
      archived team, and each of those states says why (DoD-1)
- [ ] Voting opens the wallet; on success the toast "Vote Casted successfully!" appears
- [ ] **Straight away, without a reload,** the choice is marked "Your Vote" and the other candidates
      become unavailable _(E-05: today this needs a page reload)_
- [ ] Turning the vote down in the wallet leaves everything as it was and shows no error
- [ ] A member who is not on the roll learns it **from the page**, before spending a signature
      _(gap, DoD-1 — see US-EL-08)_
- [ ] _(chain)_ Refused: a second vote ("You have already voted in this election"), someone off the
      roll ("You are not eligible to vote in this election"), a vote outside the dates ("Election is
      not currently active"), a vote for a non-candidate ("Invalid candidate")
- [ ] Opening the page costs a bounded number of chain reads whatever the candidate count _(E-06,
      see [NFR-01](#nfr-01--the-election-pages-stay-cheap-to-open))_
- [ ] Readable on a phone and in both themes (DoD-4) _(E-18)_

**Priority:** P1 · **Effort:** M · **Status:** ⚠️ E-05, E-06, E-18 · **Dependencies:** US-EL-01

---

## US-EL-03 — Publish the results and seat the board

**As a** team owner **I want to** turn the result into the actual Board of Directors, including when
the ballot ended with few votes or none **So that** the people the team chose hold the mandate, and
one absent member cannot freeze the board for good

**Acceptance Criteria — publishing:**

- [ ] "Publish Results" is offered as soon as the ballot is finished and unpublished, **wherever
      that ballot is met**, the Elections page included
- [ ] Only the contract owner can publish; for anyone else the control is disabled and says why
- [ ] Publishing opens the wallet and, on success, shows "Election results published successfully!"
- [ ] The winners are then shown as the Board of Directors and the ballot moves to past elections
- [ ] A failure is reported once, in plain words (DoD-2) _(E-10)_
- [ ] Blocked on an archived team (DoD-5)
- [ ] _(chain)_ Winners are the top candidates by vote count, seats filled in order; a tie goes to
      the lower address, so the same votes always give the same board
- [ ] _(chain)_ Publishing before the ballot is over is refused with "Election results are not ready
      to be published"; publishing twice, with "Election results have already been published"
- [ ] _(chain)_ Publishing replaces the whole previous board in the BoardOfDirectors contract

**Acceptance Criteria — a ballot that stalled:**

- [ ] A ballot past its closing time counts as finished even if only some people voted, and can be
      published from wherever it is seen
- [ ] **A ballot nobody voted in can still be closed**, freeing the team to run another. Test it
      deliberately: let a ballot expire with zero votes, publish it, create a new one
- [ ] **Zero votes crowns nobody** — with no mandate the previous board stays in place _(gap: the
      chain seats the top of the candidate list, i.e. candidate order, and the portal shows them as
      winners — E-07)_
- [ ] While a previous ballot waits to be published, the page says that this is what blocks a new
      one and offers the action that unblocks it — not just a missing button

**Priority:** P1 · **Effort:** M · **Status:** ⚠️ E-07, E-10, E-14 · **Dependencies:** US-EL-02

---

## US-EL-04 — Be told a ballot concerns me, and how it ended

**As a** team member **I want to** be told when a ballot opens, whether I am standing in it, and who
took office when it closed **So that** I do not lose my say by never hearing about it, and I learn
who represents me without having to check the page

**Acceptance Criteria:**

- [ ] When a ballot is created, every team member receives "New Election Created — New election
      created you are invited to participate"
- [ ] Opening the notification lands on the Elections page of the right team
- [ ] If notifying fails, the ballot still exists and the toast "Failed to send election
      notifications" appears — creating and notifying succeed or fail separately
- [ ] **The message says whether the recipient may vote, until when, and whether they are standing**
      _(gap: the same text goes to everyone, candidates and non-voters included)_
- [ ] **When results are published, every member is told a new board is in office**, with the names
      and a link to that ballot's results _(gap: publication is silent today)_
- [ ] Publication succeeds even if its notification fails, and the owner is told — same separation as
      at creation
- [ ] Nothing is sent for a ballot that was called off (US-EL-09)
- [ ] _(API)_ Notifications on an unknown team return 404 (the message currently reads "Team not
      fount")
- [ ] _(API, E-11)_ A caller who is not the team owner is rejected clearly, without the endpoint
      reading the board list off the wrong contract

**Priority:** P2 · **Effort:** S · **Status:** ⚠️ Creation notifies everyone with one generic text
(E-11); publication notifies nobody · **Dependencies:** US-EL-01, US-EL-03

---

## US-EL-05 — Follow the ballot while it runs

**As a** team member **I want to** see how long is left and how the vote is going **So that** I can
decide when to vote, and the process is visibly honest while it happens

**Acceptance Criteria:**

- [ ] Status badge: **Upcoming** (amber) before the opening, **Active** (green) while open,
      **Completed** (grey) afterwards
- [ ] Upcoming and Active carry a countdown ticking without a reload — days, hours, minutes, seconds
- [ ] Opening and closing are also shown as dates, not only as a countdown
- [ ] The badge turns **Completed** as soon as everyone on the roll has voted, before the closing
      time — confirm by having everyone vote early
- [ ] Each candidate shows their count and a bar, **labelled for what it is**: votes for this
      candidate out of the votes cast so far, not out of the roll _(E-13: today it reads "2/5")_
- [ ] Votes cast against eligible voters is shown for the ballot as a whole, so turnout is readable
- [ ] The count updates after a vote from this browser, without a reload
- [ ] **Nobody is called a winner before publication.** Until then, standings are standings _(E-07:
      the "Winner" badge appears the moment the countdown ends, from provisional figures)_
- [ ] Once published, winners carry the amber "Winner" badge, not clipped by the card border
- [ ] One countdown timer per page, not two per card
      _([NFR-01](#nfr-01--the-election-pages-stay-cheap-to-open))_

**Priority:** P2 · **Effort:** M · **Status:** ⚠️ E-07, E-13 · **Dependencies:** US-EL-02

---

## US-EL-06 — Know who sits on the board today

**As a** team member **I want to** see the current Board of Directors **So that** I know who holds
the mandate right now without reading an election to work it out

**Acceptance Criteria:**

- [ ] The Elections page shows "Current Board of Directors": avatar, name, role, address per member
- [ ] A published ballot shows "Elected Board of Directors" — the winners of _that_ ballot, which is
      not necessarily today's board
- [ ] A board member who left the team still renders without breaking the card
- [ ] Loading says so; no board yet says "There is no Current Board of Directors" and looks empty,
      not unfinished (DoD-3) _(E-12)_
- [ ] The grid reflows from five columns to one on a phone (DoD-4)

**Priority:** P2 · **Effort:** S · **Status:** ✅ · **Dependencies:** US-EL-03

---

## US-EL-07 — Audit a past election

**As a** team member **I want to** open any finished ballot and see its candidates, counts and
winners **So that** a board's legitimacy can be verified later by anyone — the whole reason this runs
on a chain

**Acceptance Criteria:**

- [ ] Past ballots are listed newest first: closing date, title, seats, total votes, elected members
- [ ] "View Results" opens that ballot with its own candidates, counts and winners
- [ ] Only published ballots appear
- [ ] **Every published ballot is reachable, however old** _(E-09: only the five most recent ids are
      scanned and at most three listed, although `getElectionIds()` exists on the contract)_
- [ ] The seat count is labelled as seats, not "Candidates" _(E-08)_
- [ ] The winners shown match the counts shown — a reader can add the numbers up and get that board
- [ ] With none yet, the section says "There are no Past Elections" and looks empty (DoD-3) _(E-12)_

**Priority:** P2 · **Effort:** M · **Status:** ⚠️ E-08, E-09, E-12 · **Dependencies:** US-EL-03

---

## US-EL-08 — Take part although I joined late

**As a** member who joined after the ballot was created **I want** either to be added to the roll or
to be told plainly that this ballot is not mine **So that** I am not silently excluded, and my
absence does not stop the ballot from finishing

**Acceptance Criteria:**

- [ ] A member off the roll sees on the ballot that they are not eligible for this one, and why
      _(the minimum, and DoD-1)_
- [ ] The roll reflects who is in the team when the ballot **opens**, not when it was created _(needs
      a contract change: `createElection` freezes the roll)_
- [ ] Members who left no longer hold the ballot open — "everyone has voted" is judged against people
      who can still vote
- [ ] Whatever the mechanism, the roll used for a ballot stays visible and auditable afterwards

**Priority:** P2 · **Effort:** L · **Status:** ❌ Not built _(E-15)_. The honest short-term slice is
the explanation; the rest needs a contract decision · **Dependencies:** US-EL-01

---

## US-EL-09 — Call off a ballot opened by mistake

**As a** team owner **I want to** stop a ballot I got wrong — wrong candidates, seats or dates — **So
that** the team does not have to vote in it, or wait weeks for it to expire, before we can run the
right one

**Acceptance Criteria:**

- [ ] The current ballot can be called off, and the team is free to run a new one immediately
- [ ] Members see it marked as called off, with who did it and when — it is not deleted from history
- [ ] Votes cast in a called-off ballot are never counted towards a board
- [ ] While called off, voting and publishing are disabled **in the UI with an explanation** (DoD-1),
      not left to fail at the wallet
- [ ] Only the owner sees the control

**Priority:** P3 · **Effort:** M · **Status:** 🚫 The contract can be paused and unpaused by its
owner, but that freezes everything rather than one ballot, and nothing exposes it — a paused contract
reaches members as unexplained failures. An `abandonElection` on the contract may be the better
answer; needs a contract decision first · **Dependencies:** US-EL-01

---

## Non-story work

Real work, but no actor asks for it — tracked here rather than counted as backlog value.

### NFR-01 — The election pages stay cheap to open

The pages must read the chain sparingly. This is what #1415 was opened for.

> The transport already batches — every call in the same tick collapses into one HTTP request
> (`batch: true` in the wagmi config). The cost is the number of **contract calls, cached queries,
> timers and re-renders** for the same data. Measure it in the Vue devtools query list and the
> profiler, not the network tab.

- [ ] A ballot with N candidates costs a **bounded** number of chain reads, not one growing with N
      _(E-06: each card independently reads whether I voted, who for, and the provisional results,
      and mounts the whole election composable with its two one-second timers; the section then reads
      one vote count per candidate. Nine candidates ≈ sixty cached queries.)_
- [ ] Casting a vote refreshes the counts **once**, without refetching the page
- [ ] One countdown timer per page, not two per card
- [ ] The same ballot is fetched once and shared between the view, the section and the cards
- [ ] Moving between the Elections page and the details page reuses what was already read
- [ ] **A hard refresh of either page shows the ballot** _(E-03)_

**Priority:** P1 · **Effort:** L · **Affects:** US-EL-02, US-EL-05

### TECH-01 — All chain access goes through the shared layer

#1415 asks for `useContractWriteV2`. That composable no longer exists — the portal standardised on
the V3 write layer and the three election writes already use it. What remains is the reads and the
hand-rolled pre-flight checks.

- [x] Create, vote and publish go through `composables/elections/writes.ts`
- [ ] Every read goes through `composables/elections`, not one-off calls inside components _(done:
      `ElectionActions`, `ElectionStatus`, `ElectionStats`, the Elections-page section; still inline:
      `BoDElectionDetailsSection`, `BoDElectionDetailsCard`, `PastBoDElectionsSection`,
      `PastBoDElectionCard`, `BodElectionDetailsView`)_
- [ ] No component estimates gas by hand before a write — the manual pre-flight is what produces the
      two different messages in E-10
- [ ] After a write, affected reads are invalidated through the query cache instead of refetched by
      hand (E-05, E-06)
- [ ] The elections error catalog covers every contract error, ownership refusals included (DoD-2)
- [ ] Dead code is gone: the click-outside handler bound to nothing, the unused results-modal flag,
      the commented-out blocks in four components _(E-17)_

**Priority:** P1 · **Effort:** M · **Affects:** every story

---

## Defects (issue #1415)

Severity: 🔴 blocks normal use · 🟠 real damage or dead end · 🔵 performance · 🟡 polish.

| ID   | What is wrong                                                                                                                                                                                              | Sev | Story    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-: | -------- |
| E-03 | `BodElectionDetailsView.vue` captures `electionsAddress.value` once for its own reads, so the details page can land empty on a hard refresh. Partly fixed.                                                 | 🟠  | NFR-01   |
| E-05 | After voting, "Your Vote" and the disabled buttons only appear after a reload — the counter moves but the page does not settle.                                                                            | 🟠  | US-EL-02 |
| E-06 | Every candidate card re-reads the same ballot for itself — my vote, my choice, provisional results, a full election composable and its two timers.                                                         | 🔵  | NFR-01   |
| E-07 | "Winner" badges appear when the countdown ends, from provisional standings, before publication. With no votes cast they crown candidates by address order.                                                 | 🟠  | US-EL-03 |
| E-08 | The past-election card labels the seat count "Candidates".                                                                                                                                                 | 🟡  | US-EL-07 |
| E-09 | Past elections scan only the five most recent ids and list at most three; older ballots are unreachable although `getElectionIds()` exists.                                                                | 🟠  | US-EL-07 |
| E-10 | Voting and publishing check the transaction twice — a hand-written gas estimate, then the write layer — so one failure can produce two different messages.                                                 | 🟡  | DoD-2    |
| E-11 | The notification endpoint reads the board list from the elections address with the board's ABI, assuming the elections contract is owned by the board. Unreachable branch; the 404 reads "Team not fount". | 🟠  | US-EL-04 |
| E-12 | The three empty states are pulsing grey skeletons — they read as a page that never finished loading.                                                                                                       | 🟡  | DoD-3    |
| E-13 | A candidate's vote figure is unlabeled ("2/5") and reads as votes over voters rather than over votes cast.                                                                                                 | 🟡  | US-EL-05 |
| E-14 | The "Publish Results" button is tagged in the tests as the create-election button.                                                                                                                         | 🟡  | US-EL-03 |
| E-15 | The voter roll is frozen at creation and cannot be amended. Newcomers cannot vote and are never told why; one inactive member means the ballot can only time out.                                          | 🟠  | US-EL-08 |
| E-16 | The form demands at least three directors while the contract accepts any odd number from 1. Partly fixed — the odd-number rule is now explained up front.                                                  | 🟡  | US-EL-01 |
| E-17 | Dead code: a click-outside handler bound to a ref never attached, an unused results-modal flag, commented-out blocks in four components.                                                                   | 🟡  | TECH-01  |
| E-18 | Fixed light-mode colours across the stat tiles, candidate cards and past-election cards.                                                                                                                   | 🟡  | DoD-4    |

**Fixed on 2026-08-20.** _E-01_ — the closing date was thrown away and the ballot rewritten to one
minute long; the form now takes a day **and** a time for both. _E-02_ — the opening was computed when
the modal opened, so a form left open yielded a start already in the past. _E-04_ — "Publish Results"
existed only on the details page, leaving an owner on the Elections page no way to unblock the team.

**Order of work.** E-03, then E-05 and E-06 — the performance brief the issue was opened for. Then
E-07 (nobody is a winner before publication) and E-09 (past ballots reachable). E-15 needs a contract
decision; ship the explanation half now. The 🟡 rows are a single cleanup pass.

---

_[← Elections contract](../contracts/elections/README.md)_ ·
_[Payroll user stories](../payroll/Readme.md)_
