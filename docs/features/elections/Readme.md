# Board of Directors Elections — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL) **Last updated:** 2026-08-20 **Issue:** #1415 — _[Perf] Review Election feature_

These stories describe the **whole election feature as it is actually built today**, front to back:
the two pages, the contract behind them, and the notification the backend sends. The acceptance
criteria are written as a **testing checklist**: once every box in every story is ticked, every use
case and edge case of the feature has been exercised.

**Criteria that fail today are tagged with a defect id** — _(bug E-03)_. Every id is listed in
[Annex A](#annex-a--review-findings-issue-1415) with what is wrong, where, and how bad it is. That
tagging is the difference between this document and a wish list: you can hand it to a tester before
the fixes land and the ticks will tell you exactly what is left.

> **Fixes landed as of 2026-08-20.** The first round of corrections has shipped: **E-01** (the
> ballot now takes the closing day _and_ a time of day, and the opening a start time too, so a
> one-minute election can no longer be created), **E-02** (the opening is computed when the form is
> submitted, not when it is built), and **E-04** (the owner can now publish from the Elections page,
> not only the details page). **E-03** and **E-16** are partly done, and the shared read composables
> asked for in **US-ELECTION-013** now exist and are being adopted. Every resolved row is marked _✅
> Fixed_ in [Annex A](#annex-a--review-findings-issue-1415); the tags left in the criteria below are
> the ones a tester should still expect to fail.

### Where to test

| Page                 | Route                                             | What it holds                                                                |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Elections**        | `/teams/:id/administration/bod-elections`         | Current board, current election summary, past elections, contract owner card |
| **Election details** | `/teams/:id/administration/bod-elections-details` | Candidate cards, voting, publishing, elected board                           |

Reaching them: sidebar → Administration → Board of Directors, the dashboard's company overview card,
or the "New Election Created" notification.

### Lifecycle (test in this order)

1. The owner **creates an election**: title, description, number of seats, dates, candidates.
2. Every team member is **notified** that an election is open.
3. The election sits **Upcoming** until its start date, with a live countdown.
4. Once started it is **Active**: each eligible member **casts one vote** for one candidate.
5. It becomes **Completed** when every eligible voter has voted **or** the end date passes.
6. The owner **publishes the results**: the top candidates are seated as the **Board of Directors**.
7. The published election moves to **Past elections**, and a new election becomes possible.

### Terminology

The contract-level document ([`../contracts/elections/README.md`](../contracts/elections/README.md))
is the authority on what the chain does; this document is the authority on what the screens do. It
was corrected on 2026-08-17 to match the points below, which are the ones most often misread.

- **Publishing is restricted to the owner.** `publishResults` is `onlyOwner`, not "callable by
  anyone once conditions are met". The owner is the person who deployed the team's contracts, not
  the board.
- **"One election at a time" is stricter than it sounds.** A new election is refused until the
  previous one's **results have been published** — not merely until it ends. An election that ran
  out and was never published blocks the team forever.
- **Voters are not chosen.** The owner picks candidates; the voter roll is silently filled with
  **every current team member**. There is no voter picker in the UI.
- **The board is seated by the contract, not by the portal.** Publishing writes the winners straight
  into the BoardOfDirectors contract; nothing in the portal confirms or edits that list.

---

## Status Overview

| User Story      | Title                                        | Actor  | Status | Priority | Effort |
| --------------- | -------------------------------------------- | ------ | :----: | :------: | ------ |
| US-ELECTION-001 | Create an election                           | Owner  |   ✅   |    P1    | M      |
| US-ELECTION-002 | Only one election at a time                  | Owner  |   ✅   |    P2    | S      |
| US-ELECTION-003 | Tell the team an election is open            | System |   ⚠️   |    P3    | S      |
| US-ELECTION-004 | See the current election and where it stands | Member |   ✅   |    P1    | M      |
| US-ELECTION-005 | Cast a vote                                  | Voter  |   ⚠️   |    P1    | M      |
| US-ELECTION-006 | Follow the standings                         | Member |   ⚠️   |    P2    | M      |
| US-ELECTION-007 | Publish the results and seat the board       | Owner  |   ⚠️   |    P1    | M      |
| US-ELECTION-008 | See the Board of Directors                   | Member |   ✅   |    P2    | S      |
| US-ELECTION-009 | Browse past elections                        | Member |   ⚠️   |    P2    | M      |
| US-ELECTION-010 | Know why an action is unavailable            | Member |   ⚠️   |    P2    | S      |
| US-ELECTION-011 | Read a failure in plain words                | Member |   ⚠️   |    P2    | S      |
| US-ELECTION-012 | Load the pages without hammering the chain   | System |   ❌   |    P1    | L      |
| US-ELECTION-013 | Reach the chain through the standard layer   | Dev    |   ⚠️   |    P1    | M      |
| US-ELECTION-014 | Suspend an election                          | Owner  |   🚫   |    P4    | M      |

✅ works · ⚠️ works with known defects · ❌ not acceptable today · 🚫 contract only, no UI

> Criteria tagged _(chain)_ describe contract behaviour a tester cannot always trigger from the
> screen; check them against the contract test suite or a direct call. Criteria tagged _(API)_
> describe a server response — verify with a request from the Bruno collection in
> `backend/bruno/CNCPortal`, not through the portal.

---

## US-ELECTION-001: Create an Election

**As a** team owner **I want to** open an election with a set of candidates and a number of seats
**So that** the board is chosen by a vote the whole team can audit

**Acceptance Criteria — the form:**

- [ ] "Create Election" is visible on the Elections page and opens a modal titled "Create election"
- [ ] The title must be at least 3 characters, the description at least 10
- [ ] "Number of Board Of Directors" must be an odd number; the field carries a help line that
      explains the odd-number rule up front ("An odd number — 3, 5, 7 …") _(bug E-16 partly fixed:
      the rule is now stated before the error, but the form still floors at 3 while the contract
      accepts any odd number from 1)_
- [ ] **The opening is picked as a day _and_ a time of day**, or left blank to open a couple of
      minutes after creation — the field says which in plain words. Leaving the day blank is the "as
      soon as possible" path; picking a day lets the owner schedule the ballot ahead
- [ ] **The end is picked as a day _and_ a time of day**, so the owner decides the hour the ballot
      closes (an untouched closing time runs to the end of the chosen day)
- [ ] An end that falls before the opening — or too soon after it — is refused in the form, and the
      message states the minimum length of a ballot
- [ ] Candidates are picked from the team roster only; at least one is required, and at least as
      many as there are seats ("At least N candidates are required.")
- [ ] The same person cannot be added twice ("Duplicate candidates are not allowed.")
- [ ] The submit button is disabled while the transaction runs and while the team is archived

**Acceptance Criteria — what actually gets created:**

- [ ] **The election opens and closes exactly at the moments the owner picked** — the form no longer
      rewrites the dates, and the create handler sends them to the chain unchanged _(E-01 fixed)_
- [ ] The opening time is computed **when the form is submitted**, not when it was opened — a modal
      left open for ten minutes still produces a valid election _(E-02 fixed)_
- [ ] Every current team member is registered as an eligible voter
- [ ] On success: the toast "Election created successfully!", the modal closes, and the new election
      shows up as the current one
- [ ] _(chain)_ The contract refuses an even or zero seat count, an end date not after the start, a
      start date not in the future, fewer candidates than seats, and duplicate candidates or voters
- [ ] Only the owner can create; everyone else sees the button disabled with "Only the owner can
      create elections"
- [ ] Creating is blocked while the team is archived, with the archived tooltip explaining why

**Priority:** P1 · **Effort:** M · **Status:** ✅ Works end to end (E-01, E-02 fixed); only polish
left — E-16 floor-at-3 and E-17 dead code · **Dependencies:** US-TEAM-001

---

## US-ELECTION-002: Only One Election at a Time

**As a** team owner **I want to** be stopped from opening a second election while one is running
**So that** the team's votes are never split across two ballots

**Acceptance Criteria:**

- [ ] While an election exists whose results are not published, "Create Election" is not offered
- [ ] _(chain)_ Forcing the call anyway is refused with "A previous election is still ongoing"
- [ ] Once results are published, "Create Election" comes back
- [ ] **An election that ended without ever being published still blocks the team** — the only way
      out is to publish it. Test this deliberately: let an election expire with zero votes, then
      publish it and confirm a new one can be created
- [ ] The owner is offered the publish action **on the Elections page too**, so the team can be
      unblocked without opening the details page _(E-04 fixed — `ElectionActions` shows
      `PublishResult` whenever a finished election awaits publication)_

**Priority:** P2 · **Effort:** S · **Status:** ✅ · **Dependencies:** US-ELECTION-001

---

## US-ELECTION-003: Tell the Team an Election Is Open

**As a** team member **I want to** be told when an election opens **So that** I don't miss my window
to vote

**Acceptance Criteria:**

- [ ] After the election is created, every team member receives the notification "New Election
      Created — New election created you are invited to participate"
- [ ] Clicking it lands on the Elections page of the right team
- [ ] If the notification fails, the election is still created and the toast "Failed to send
      election notifications" appears — creating and notifying are separate outcomes
- [ ] No second notification is sent when the results are published _(gap: publishing is silent; the
      team learns about the new board by visiting the page)_
- [ ] _(API, bug E-11)_ A caller who is not the team owner gets a confusing rejection: the endpoint
      looks up the board on the wrong contract address and assumes the elections contract is owned
      by the board, which it never is. The branch is unreachable in practice because the chain
      already restricts creation to the owner
- [ ] _(API)_ Requesting notifications for an unknown team returns 404 (message currently reads
      "Team not fount")

**Priority:** P3 · **Effort:** S · **Status:** ⚠️ · **Dependencies:** US-ELECTION-001

---

## US-ELECTION-004: See the Current Election and Where It Stands

**As a** team member **I want to** see the open election at a glance **So that** I know what is
being decided and how long I have

**Acceptance Criteria:**

- [ ] The Elections page shows the election's title, description and a status badge
- [ ] The badge reads **Upcoming** (amber) before the start, **Active** (green) while voting is
      open, **Completed** (grey) afterwards
- [ ] Upcoming and Active badges carry a live countdown that ticks down without a page reload, in
      days, then hours, then minutes, then seconds
- [ ] The status turns **Completed** as soon as every eligible voter has voted, even before the end
      date — this is intended, and a tester should confirm it by having everyone vote early
- [ ] Four tiles show seats over candidates, start date, end date, and votes cast over eligible
      voters
- [ ] The tiles stack instead of squeezing on a narrow screen
- [ ] With no election ever created, the page shows the "There is no Current Election" panel _(bug
      E-12: that panel is built out of pulsing grey blocks and reads as a page still loading)_
- [ ] The action button reads "Vote Now" while Active, "View Results" once Completed, "View Details"
      otherwise, and it is not shown on the details page itself

**Priority:** P1 · **Effort:** M · **Status:** ✅ · **Dependencies:** US-ELECTION-001

---

## US-ELECTION-005: Cast a Vote

**As an** eligible team member **I want to** vote once for one candidate **So that** my preference
counts towards the board

**Acceptance Criteria:**

- [ ] The details page lists every candidate as a card with their name, role, address and avatar
- [ ] "Cast a Vote" is enabled only while the election is Active — disabled Upcoming, disabled once
      Completed, disabled while the team is archived
- [ ] Voting opens the wallet; on success the toast "Vote Casted successfully!" appears
- [ ] **After voting, my card immediately shows "Your Vote" and the other cards become unavailable**
      _(bug E-05 — today the counter moves but "Your Vote" and the disabled state only appear after
      a page reload)_
- [ ] A wallet rejection leaves everything untouched and shows no error toast
- [ ] _(chain)_ A second vote is refused with "You have already voted in this election"
- [ ] _(chain)_ Someone outside the voter roll is refused with "You are not eligible to vote in this
      election"
- [ ] _(chain)_ A vote before the start or after the end is refused with "Election is not currently
      active"
- [ ] _(chain)_ A vote for someone who is not a candidate is refused with "Invalid candidate"
- [ ] _(bug E-15)_ Someone who joins the team after the election was created cannot vote, and the
      roster cannot be amended — the election then can only end by reaching its end date

**Priority:** P1 · **Effort:** M · **Status:** ⚠️ · **Dependencies:** US-ELECTION-001

---

## US-ELECTION-006: Follow the Standings

**As a** team member **I want to** see how the vote is going **So that** the process is transparent
while it runs

**Acceptance Criteria:**

- [ ] Each candidate card shows their vote count and a progress bar against the votes cast so far
- [ ] The count refreshes after every vote cast from this browser
- [ ] _(bug E-13)_ The figure is unlabeled ("2/5") and is easily misread as votes over voters — it
      is votes for this candidate over votes cast in total
- [ ] **The "Winner" badge appears only after the results are published** _(bug E-07 — today it
      appears as soon as the countdown ends, from provisional standings; on an election with no
      votes at all it crowns candidates by address order)_
- [ ] Once published, the winners' cards carry the amber "Winner" badge and the badge is not clipped
      by the card border
- [ ] A candidate who is not in the team roster is displayed as "Unknown / Candidate" rather than
      breaking the card

**Priority:** P2 · **Effort:** M · **Status:** ⚠️ · **Dependencies:** US-ELECTION-005

---

## US-ELECTION-007: Publish the Results and Seat the Board

**As a** team owner **I want to** publish the results **So that** the winners actually become the
Board of Directors

**Acceptance Criteria:**

- [ ] "Publish Results" is offered once the election is Completed and the results are not yet out
- [ ] **It is offered wherever the owner meets a finished election, including the Elections page**
      _(E-04 fixed)_
- [ ] Only the contract owner can publish; for anyone else the button is disabled
- [ ] Publishing opens the wallet and, on success, shows "Election results published successfully!"
      and refreshes the past-elections list
- [ ] After publishing, the elected members appear as the Board of Directors and the election moves
      to Past elections
- [ ] _(chain)_ Winners are the top candidates by vote count, seats filled in order; a tie is broken
      by the lower address, so the same input always produces the same board
- [ ] _(chain)_ Publishing before the election is over — and before everyone has voted — is refused
      with "Election results are not ready to be published"
- [ ] _(chain)_ Publishing twice is refused with "Election results have already been published"
- [ ] _(chain)_ Publishing writes the winners into the BoardOfDirectors contract, replacing the
      previous board wholesale
- [ ] Publishing is blocked while the team is archived
- [ ] _(bug E-10)_ A failure can surface twice over, from two different code paths, with two
      different wordings

**Priority:** P1 · **Effort:** M · **Status:** ⚠️ · **Dependencies:** US-ELECTION-005

---

## US-ELECTION-008: See the Board of Directors

**As a** team member **I want to** see who currently sits on the board **So that** I know who holds
the mandate

**Acceptance Criteria:**

- [ ] The Elections page shows "Current Board of Directors" with a card per member: avatar, name,
      role, address
- [ ] Opening a published election shows "Elected Board of Directors" — the winners of _that_
      election, not the board as it stands today
- [ ] While loading, the section says so; with no board yet it shows "There is no Current Board of
      Directors" _(bug E-12: same pulsing-skeleton empty state)_
- [ ] A board member who has left the team still renders without breaking the card
- [ ] The grid reflows from five columns down to one on a phone

**Priority:** P2 · **Effort:** S · **Status:** ✅ · **Dependencies:** US-ELECTION-007

---

## US-ELECTION-009: Browse Past Elections

**As a** team member **I want to** look back at finished elections **So that** past mandates stay
auditable

**Acceptance Criteria:**

- [ ] Past elections are listed newest first, each card showing the end date, the title, the seat
      count, the total votes and the elected members
- [ ] "View Results" opens that election's details page, with its own candidates, counts and winners
- [ ] Only published elections appear here
- [ ] With none yet, the section says "There are no Past Elections" _(bug E-12)_
- [ ] **Every published election is reachable** _(bug E-09 — today only the five most recent ids are
      scanned and at most three are listed; anything older is invisible with no way to page back)_
- [ ] _(bug E-08)_ The card labels the seat count as "Candidates", so a 3-seat election with 7
      candidates reports "Candidates: 3"

**Priority:** P2 · **Effort:** M · **Status:** ⚠️ · **Dependencies:** US-ELECTION-007

---

## US-ELECTION-010: Know Why an Action Is Unavailable

**As a** team member **I want** every disabled button to tell me why **So that** I am never left
guessing whether the portal is broken

**Acceptance Criteria:**

- [ ] "Create Election" disabled for a non-owner → "Only the owner can create elections"
- [ ] Any action on an archived team → the archived-team tooltip
- [ ] "Cast a Vote" disabled because I already voted → the card shows "Your Vote" instead of a
      tooltip _(depends on E-05)_
- [ ] "Cast a Vote" disabled because the election has not started, or is over → **a tooltip says
      so** _(gap: the button is simply dead, with no explanation)_
- [ ] "Publish Results" disabled for a non-owner → **a tooltip says so** _(gap: only the archived
      tooltip is wired up)_
- [ ] Nothing is offered to a member who is not on the voter roll beyond a disabled button — they
      only learn they are ineligible if they try _(gap)_

**Priority:** P2 · **Effort:** S · **Status:** ⚠️ · **Dependencies:** US-ELECTION-005

---

## US-ELECTION-011: Read a Failure in Plain Words

**As a** team member **I want** every rejected transaction explained in ordinary language **So
that** I can tell what to do next

**Acceptance Criteria:**

- [ ] Every refusal from the elections contract is translated: not found, not active, still ongoing,
      already voted, not eligible, already published, not ready, odd seat count, invalid dates,
      invalid candidate, not enough candidates, duplicate candidates, empty or duplicate voters
- [ ] A wallet rejection is never shown as an error — it is treated as "the user changed their mind"
- [ ] Creation errors appear inside the modal so the owner can correct and resubmit; voting and
      publishing errors appear as toasts
- [ ] A refusal because the caller is not the owner is translated too, not shown as a raw contract
      error _(gap)_
- [ ] _(bug E-10)_ Voting and publishing check the transaction twice — once by hand, once through
      the write layer — and the two produce different messages for the same failure

**Priority:** P2 · **Effort:** S · **Status:** ⚠️ · **Dependencies:** US-ELECTION-005

---

## US-ELECTION-012: Load the Pages Without Hammering the Chain

**As a** system **I want** the election pages to read the chain sparingly **So that** the portal
stays fast and stays inside its RPC budget

This is the story the issue was opened for. It is the only one marked ❌.

> **Where the cost actually is.** The transport already batches: every call fired in the same tick
> collapses into one HTTP request (`batch: true` in the wagmi config). So this is not a story about
> the number of network requests — it is about the number of **contract calls, cached queries,
> timers and re-renders** the page creates for the same data. Measure it in the Vue devtools query
> list and the profiler, not in the network tab.

**Acceptance Criteria:**

- [ ] Opening the details page of an election with N candidates costs **a bounded number of chain
      reads, not a number that grows with N** _(bug E-06 — today each candidate card independently
      reads whether I voted, who I voted for, the provisional results, and mounts the whole election
      composable (four more reads) for itself; on top of that the section reads one vote count per
      candidate. Nine candidates ≈ sixty cached queries for a page that needs a handful.)_
- [ ] Casting a vote refreshes the counts **once**, without refetching the whole page
- [ ] The countdown is driven by **one** timer for the page, not one per card _(today each card runs
      two one-second timers of its own — eighteen timers on a nine-candidate page)_
- [ ] The same election data is fetched once and shared, not fetched independently by the view, the
      section and every card
- [ ] Navigating between the Elections page and the details page reuses what was already read
- [ ] **A hard refresh of either page shows the election** _(bug E-03 partly fixed — the shared read
      composables (`composables/elections`) now follow the contract address reactively, so the
      Elections-page section recovers on a late-arriving address; but `BodElectionDetailsView.vue`
      still captures `electionsAddress.value` once when it builds its own reads, so the details page
      can still land empty on a hard refresh until the reads there move onto the composables)_

**Priority:** P1 · **Effort:** L · **Status:** ❌ · **Dependencies:** US-ELECTION-004,
US-ELECTION-006

---

## US-ELECTION-013: Reach the Chain Through the Standard Layer

**As a** developer **I want** every election call to go through the shared contract layer **So
that** errors, loading states and cache invalidation behave the same as everywhere else in the
portal

**A note on the issue's wording.** #1415 asks for `useContractWriteV2`. That composable no longer
exists — the portal standardised on the V3 write layer, and the three election writes (create, vote,
publish) already use it. The obligation is therefore met for writes; what remains is the reads and
the hand-rolled pre-flight checks around those writes.

**Acceptance Criteria:**

- [ ] Creating, voting and publishing all go through the shared write layer — **done**
      (`composables/elections/writes.ts` wraps them in `useContractWritesV3`)
- [ ] Every read goes through the election read composables (`composables/elections`), not through
      one-off calls written inside components _(in progress: `reads.ts` and the aggregate
      `useBoDElections` now exist and follow the address correctly, and `ElectionActions`,
      `ElectionStatus`, `ElectionStats` and the Elections-page section already consume them; still
      inline are `BoDElectionDetailsSection`, `BoDElectionDetailsCard`, `PastBoDElectionsSection`,
      `PastBoDElectionCard` and `BodElectionDetailsView` — see E-03, E-06)_
- [ ] No component estimates gas by hand before a write: the write layer already simulates, and the
      manual pre-flight is what produces the duplicate error messages in E-10
- [ ] After a successful write, the affected reads are invalidated through the query cache rather
      than refetched by hand (E-05, E-06)
- [ ] The elections error catalog covers every contract error, including ownership refusals
- [ ] Dead code is gone: the click-outside handler bound to nothing in the create form, the unused
      results-modal flag, and the commented-out blocks left in four components _(bug E-17)_

**Priority:** P1 · **Effort:** M · **Status:** ⚠️ Writes done, read composables now exist and are
being adopted (some components still inline) · **Dependencies:** none

---

## US-ELECTION-014: Suspend an Election

**As a** team owner **I want to** freeze an election that was opened by mistake **So that** a bad
ballot does not have to run to its end date

**Status: 🚫 not built.** The contract can be paused and unpaused by its owner, which freezes
creating, voting and publishing. Nothing in the portal exposes it, and a paused contract would
surface to members as unexplained failures.

**Acceptance Criteria (when built):**

- [ ] The owner can suspend the elections contract and resume it
- [ ] While suspended, voting and publishing are disabled in the UI with a tooltip that says the
      election is suspended — not left to fail at the wallet
- [ ] Suspending does not lose votes already cast; resuming continues the same election
- [ ] Only the owner sees the control

**Priority:** P4 · **Effort:** M · **Status:** 🚫 Contract only · **Dependencies:** US-ELECTION-001

---

## Annex A — Review Findings (issue #1415)

Severity: 🔴 blocks normal use · 🟠 real damage or dead end · 🔵 performance · 🟡 polish.

| ID   | What is wrong                                                                                                                                                                                                                                                                                                                                                                         | Sev | Story         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-: | ------------- |
| E-01 | **✅ Fixed (2026-08-20).** _Was:_ the closing date the owner picks is silently thrown away; the calendar has no time of day, so the start reads as already past and the ballot is rewritten to open in one minute and close one minute later. The form now takes a day **and** a time for both opening and closing, and the create handler forwards them to the chain unchanged.      | 🔴  | 001           |
| E-02 | **✅ Fixed (2026-08-20).** _Was:_ the opening time is computed once, when the form is built, instead of when it is submitted, so a modal left open a few minutes yields a start already in the past. It is now computed at submit time, and a slow clock keeps the announced opening fresh while the form is open.                                                                    | 🟠  | 001           |
| E-03 | **🟡 Partly fixed.** The shared read composables (`composables/elections`) now follow the contract address reactively, so components on them recover on a late-arriving address. `BodElectionDetailsView.vue` still captures `electionsAddress.value` once for its own reads, so the details page can still land empty on a hard refresh until those reads move onto the composables. | 🟠  | 012           |
| E-04 | **✅ Fixed (2026-08-20).** _Was:_ "Publish Results" only existed on the details page, so on the Elections page the owner had no way to publish — and until it is published, no new election can be created. `ElectionActions` now renders `PublishResult` wherever a finished election awaits publication, the Elections page included.                                               | 🟠  | 002, 007      |
| E-05 | After voting, the page does not settle: the counter moves but "Your Vote" and the disabled buttons only appear after a reload.                                                                                                                                                                                                                                                        | 🟠  | 005           |
| E-06 | Every candidate card re-reads the same election for itself — my vote, the provisional results, a full copy of the election composable and its two one-second timers — on top of one vote-count read per candidate. The transport batches the requests, so the cost lands on cached queries, timers and re-renders.                                                                    | 🔵  | 012           |
| E-07 | "Winner" badges appear as soon as the countdown ends, from provisional standings, before anything is published. With no votes cast it crowns candidates by address order.                                                                                                                                                                                                             | 🟠  | 006           |
| E-08 | The past-election card labels the seat count "Candidates".                                                                                                                                                                                                                                                                                                                            | 🟡  | 009           |
| E-09 | Past elections scan only the five most recent ids and list at most three. Older published elections are unreachable.                                                                                                                                                                                                                                                                  | 🟠  | 009           |
| E-10 | Voting and publishing check the transaction twice — a hand-written gas estimate, then the write layer — so one failure can produce two different messages.                                                                                                                                                                                                                            | 🟡  | 007, 011, 013 |
| E-11 | The notification endpoint reads the board list from the elections address with the board's ABI, and assumes the elections contract is owned by the board, which it never is. The whole branch is unreachable, and the 404 reads "Team not fount".                                                                                                                                     | 🟠  | 003           |
| E-12 | The three empty states are pulsing grey skeletons with a sentence underneath — they read as a page that never finished loading.                                                                                                                                                                                                                                                       | 🟡  | 004, 008, 009 |
| E-13 | A candidate's vote figure is unlabeled ("2/5") and reads as votes over voters rather than votes over votes cast.                                                                                                                                                                                                                                                                      | 🟡  | 006           |
| E-14 | The "Publish Results" button is tagged in the tests as the create-election button.                                                                                                                                                                                                                                                                                                    | 🟡  | 007           |
| E-15 | The voter roll is frozen at creation and cannot be amended. Newcomers cannot vote, and one inactive member means the election can only end by timing out.                                                                                                                                                                                                                             | 🟠  | 005           |
| E-16 | **🟡 Partly fixed.** The odd-number rule is now explained up front (a help line on the field and the schema messages). The form still demands at least three directors while the contract accepts any odd number from 1 — that floor remains.                                                                                                                                         | 🟡  | 001           |
| E-17 | Dead code: a click-outside handler bound to a ref that is never attached, an unused results-modal flag, commented-out blocks in four components.                                                                                                                                                                                                                                      | 🟡  | 013           |
| E-18 | Fixed light-mode colours across the stat tiles, candidate cards and past-election cards.                                                                                                                                                                                                                                                                                              | 🟡  | 004, 006, 009 |

**Suggested order of work:** E-01 and E-04 are done — the one-minute ballot and the team stranded by
an unpublishable election are both gone. Finish E-03 (move the details view onto the composables),
then E-05, E-06 (the performance brief the issue was opened for), then E-07, E-09, E-15. The 🟡 rows
— including what is left of E-16 and E-17 — are a single cleanup pass.

---

## Annex B — Closing Issue #1415

The issue asks for three things. This is what each one means here.

| Obligation                      | Where it is answered                                                                                                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Review the Election feature** | This document: fourteen stories covering the whole feature, plus eighteen findings in Annex A.                                                                                                                                                                        |
| **Fix the issues**              | Annex A, ordered. Each fix is verified by the criteria tagged with its id — the tag disappears when the fix lands.                                                                                                                                                    |
| **Use `useContractWriteV2`**    | US-ELECTION-013. V2 no longer exists; the portal moved to the V3 write layer and all three election writes already use it. The read composables asked for now exist (`composables/elections`) and are being adopted; a few components still read inline (E-03, E-06). |

---

## How to Use These User Stories

1. **For QA:** walk the stories in lifecycle order and tick every box. A criterion carrying a defect
   tag is expected to fail until that fix ships — tick it only when it genuinely passes.
2. **For Development:** pick a finding from Annex A, read the story it belongs to, and let the
   criteria define done.
3. **For Product:** priority order is P1 > P2 > P3. E-01 and E-04 — the two that stopped an owner
   running a real election end to end — are now fixed, so the next front is the performance brief
   the issue was opened for (E-03, E-05, E-06).

---

_[← Elections contract](../contracts/elections/README.md)_ ·
_[Payroll user stories](../payroll/Readme.md)_
