# Board of Directors Elections — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL) **Last updated:** 2026-08-21 **Issue:** #1415 — _[Perf] Review Election feature_

The feature is three actions: the team owner **creates an election**, members **cast a vote**, and
the owner **publishes the results**, which updates the Board of Directors. Every other story below
supports one of those three.

### Words used in this document

The same word is used here, on screen and in the contract. There are no synonyms.

| Word                    | What it means                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Election**            | One vote from start to end. Never called anything else.                                    |
| **Cast a vote**         | The action of voting. One member casts one vote for one candidate.                         |
| **Candidate**           | A team member the owner put forward. The list is fixed when the election is created.       |
| **Eligible voter**      | A team member allowed to cast a vote in this election. The list is fixed at creation time. |
| **Number of directors** | How many candidates will be elected. Must be an odd number.                                |
| **Vote count**          | How many votes a candidate has received so far.                                            |
| **Winner**              | A candidate elected once the results are published — not before.                           |
| **Board of Directors**  | The people currently in office. Publishing an election's results replaces the whole board. |

### Lifecycle (test in this order)

1. The owner **creates an election** — title, number of directors, dates, candidates (US-EL-01).
2. Every team member is **notified that it started** (US-EL-04).
3. Eligible voters **cast a vote** while the election is open (US-EL-02).
4. Anyone can see the **time remaining** (US-EL-05) and the **vote counts** (US-EL-06).
5. The election ends — the end date is reached, **or** every eligible voter has cast a vote.
6. The owner **publishes the results**; the winners become the Board of Directors (US-EL-03).
7. Every member is **notified of the new board** (US-EL-09), which is then shown as current
   (US-EL-07) and the election can be looked up later (US-EL-08).

### Where to test

| Page                 | Route                                             | What it holds                                                                    |
| -------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Elections**        | `/teams/:id/administration/bod-elections`         | Current board, current election summary, finished elections, contract owner card |
| **Election details** | `/teams/:id/administration/bod-elections-details` | Candidate cards, voting, publishing, elected board                               |

Reaching them: sidebar → Administration → Board of Directors, the dashboard's company overview card,
or the "New Election Created" notification.

### Actors

- **Owner** — the person who deployed the team's contracts. The only one who can create an election
  and publish its results. Not the board.
- **Eligible voter** — a team member who was in the team when the election was created. Candidates
  can cast a vote too, if they are eligible.
- **Candidate** — a team member the owner put forward.
- **Team member** — anyone in the team, eligible or not. Everyone can read the election and the
  board.

### Facts that are often misread

- **Only the owner can publish the results** — `publishResults` is `onlyOwner`.
- **"One election at a time" is stricter than it sounds.** A new election is refused until the
  previous one's results have been **published**, not merely until it has ended. An election that
  ended and was never published blocks the team for good — that is what US-EL-03 has to solve.
- **The owner does not choose the voters.** The owner chooses the candidates. Every team member
  present at creation time is added as an eligible voter, and that list never changes afterwards.
- **The board is updated by the contract, not by the portal.** Publishing writes the winners
  straight into the BoardOfDirectors contract, replacing every previous member at once.
- **An election can end early** — when the end date is reached _or_ when every eligible voter has
  cast a vote, whichever comes first.

The contract document ([`../contracts/elections/README.md`](../contracts/elections/README.md)) is
the authority on what the chain does; this one on what people can do.

---

## Status Overview

| Story    | As a…       | I want to…                                            | Status | Priority | Effort |
| -------- | ----------- | ----------------------------------------------------- | :----: | :------: | ------ |
| US-EL-01 | Owner       | Create an election                                    |   ✅   |    P1    | M      |
| US-EL-02 | Voter       | Cast a vote and see that it counted                   |   ⚠️   |    P1    | M      |
| US-EL-03 | Owner       | Publish the results and update the Board of Directors |   ⚠️   |    P1    | M      |
| US-EL-04 | Team member | Be told an election has started                       |   ⚠️   |    P2    | S      |
| US-EL-05 | Voter       | Know how long I have left to cast my vote             |   ✅   |    P2    | S      |
| US-EL-06 | Team member | Follow the vote counts while the election runs        |   ⚠️   |    P2    | M      |
| US-EL-07 | Team member | Know who sits on the Board of Directors today         |   ✅   |    P2    | S      |
| US-EL-08 | Team member | Look up a finished election                           |   ⚠️   |    P2    | M      |
| US-EL-09 | Team member | Be told a new Board of Directors is in place          |   ❌   |    P3    | S      |
| US-EL-10 | New member  | Cast a vote although I joined the team late           |   ❌   |    P2    | L      |
| US-EL-11 | Owner       | Cancel an election created by mistake                 |   🚫   |    P3    | M      |

✅ works · ⚠️ works, but has known defects · ❌ not built · 🚫 the contract allows it, nothing in
the portal exposes it

> Criteria tagged _(chain)_ describe contract behaviour a tester cannot always trigger from the
> screen — check them against the contract test suite. Criteria tagged _(API)_ describe a server
> response — verify them with the Bruno collection in `backend/bruno/CNCPortal`. Criteria carrying a
> defect id — _(E-07)_ — say what the feature **should** do; the tag tells a tester which ones are
> expected to fail today. See [Defects](#defects-issue-1415).

---

## Definition of Done (applies to every story)

- **DoD-1 — Nothing is disabled without saying why.** Every disabled control explains itself on
  hover: you are not the owner, the team is archived, the election has not started, the election is
  over, you have already cast a vote, you are not an eligible voter.
- **DoD-2 — Every refusal is written in ordinary words.** Every error the contract can return is
  translated: election not found, election not active, previous election still ongoing, already
  voted, not eligible, results already published, results not ready, even number of directors,
  invalid dates, invalid candidate, too few candidates, duplicate candidates, empty or duplicate
  voters, and refusals because the caller is not the owner. Refusing in the wallet is not an error —
  nothing is shown. Errors while creating appear inside the modal so the owner can correct and try
  again; errors while voting or publishing appear as toasts. One failure produces **one** message
  _(E-10)_.
- **DoD-3 — The page says what state it is in.** Loading, empty and error look different from one
  another. An empty section says it is empty instead of pulsing like something still loading
  _(E-12)_.
- **DoD-4 — It works in both themes and on a phone.** No hard-coded light-mode colours _(E-18)_;
  grids reflow to a single column.
- **DoD-5 — Archived teams are read-only.** Every action that writes is blocked, with the archived
  tooltip.

---

## US-EL-01 — Create an election

**As a** team owner **I want to** start an election with the candidates and the number of directors
I choose **So that** the board is chosen by a vote the whole team can check afterwards

**Acceptance Criteria — filling the form:**

- [ ] "Create Election" on the Elections page opens a modal titled "Create election"
- [ ] The title is 3 characters or more, the description 10 or more
- [ ] "Number of Directors" must be an odd number, and the field says so before the owner gets it
      wrong — "An odd number — 3, 5, 7 …" _(E-16: the form still refuses fewer than 3, while the
      contract accepts any odd number from 1)_
- [ ] "Start date" takes **a day and a time**, or is left empty for "a couple of minutes from now",
      and the field says which is which
- [ ] "End date" takes **a day and a time**; a time left untouched runs to the end of that day
- [ ] An end date before the start date, or too close to it, is refused inside the form, and the
      message says how long an election must last
- [ ] Candidates are picked from the team members: at least as many as there are directors to elect
      ("At least N candidates are required."), and never the same person twice ("Duplicate
      candidates are not allowed.")
- [ ] **The form says who will be allowed to cast a vote** — every current team member, and the
      owner does not choose them _(gap: the list of eligible voters is filled silently from the team
      members and no screen ever shows it)_

**Acceptance Criteria — the election that gets created:**

- [ ] It starts and ends at the dates the owner picked; nothing is rewritten on the way to the chain
- [ ] The start date is worked out when the form is submitted, not when the modal was opened: a form
      left open for ten minutes still produces a valid election
- [ ] Every current team member is registered as an eligible voter
- [ ] On success: the toast "Election created successfully!", the modal closes, and the new election
      is the current one
- [ ] While a previous election's results are not published, "Create Election" is not offered — and
      _(chain)_ forcing the call anyway is refused with "A previous election is still ongoing"
- [ ] Only the owner can create an election; for anyone else the button is disabled and says why
      (DoD-1)
- [ ] _(chain)_ Refused: an even or zero number of directors, an end date not after the start date,
      a start date not in the future, fewer candidates than directors to elect, duplicate
      candidates, duplicate or empty voters

**Priority:** P1 · **Effort:** M · **Status:** ✅ Works end to end; E-16 and the hidden list of
eligible voters are what is left · **Dependencies:** US-TEAM-001

---

## US-EL-02 — Cast a vote and see that it counted

**As an** eligible voter **I want to** see who the candidates are, cast one vote, and be told
straight away that it went through **So that** my vote is a decision and not a guess, and I never
have to try again to be sure

**Acceptance Criteria — the candidates:**

- [ ] Every candidate is shown with their name, their role in the team, their wallet address and
      their avatar
- [ ] The list belongs to the election that was opened, whichever one it is — a finished one
      included
- [ ] A candidate who has since left the team is still shown, as "Unknown / Candidate", instead of
      breaking the card
- [ ] The election's title and description are visible on the page where the vote is cast, not only
      on the summary page

**Acceptance Criteria — casting the vote:**

- [ ] "Cast a Vote" is offered only while the election is open — not before it starts, not once it
      is over, never on an archived team — and each of those states says why (DoD-1)
- [ ] Casting a vote opens the wallet; on success the toast "Vote Casted successfully!" appears
- [ ] **Straight away, without reloading the page,** my choice is marked "Your Vote" and the other
      candidates become unavailable to me _(E-05: today this only shows after a reload)_
- [ ] Refusing in the wallet leaves everything as it was, and shows no error
- [ ] A team member who is not an eligible voter learns it **from the page**, before spending a
      wallet signature _(gap, DoD-1 — see US-EL-10)_
- [ ] _(chain)_ Refused: a second vote ("You have already voted in this election"), a member who is
      not eligible ("You are not eligible to vote in this election"), a vote before the start date
      or after the end date ("Election is not currently active"), a vote for someone who is not a
      candidate ("Invalid candidate")
- [ ] Opening the page costs a bounded number of chain reads whatever the number of candidates
      _(E-06, see [NFR-01](#nfr-01--the-election-pages-stay-cheap-to-open))_
- [ ] Readable on a phone and in both themes (DoD-4) _(E-18)_

**Priority:** P1 · **Effort:** M · **Status:** ⚠️ E-05, E-06, E-18 · **Dependencies:** US-EL-01

---

## US-EL-03 — Publish the results and update the Board of Directors

**As a** team owner **I want to** turn the result into the actual Board of Directors, including when
the election ended with few votes or none at all **So that** the people the team chose take office,
and one absent member cannot block the board for good

**Acceptance Criteria — publishing:**

- [ ] "Publish Results" is offered as soon as the election is over and its results are not out —
      **wherever that election is shown**, the Elections page included
- [ ] Only the contract owner can publish; for anyone else the control is disabled and says why
      (DoD-1)
- [ ] Publishing opens the wallet and, on success, shows "Election results published successfully!"
- [ ] The winners are then shown as the Board of Directors, and the election moves to the finished
      ones
- [ ] A failure is reported once, in ordinary words (DoD-2) _(E-10)_
- [ ] Blocked on an archived team (DoD-5)
- [ ] _(chain)_ The winners are the candidates with the most votes, filling the available positions
      in order; a tie goes to the lower wallet address, so the same votes always give the same board
- [ ] _(chain)_ Publishing before the election is over is refused with "Election results are not
      ready to be published"; publishing twice is refused with "Election results have already been
      published"
- [ ] _(chain)_ Publishing replaces every member of the previous board in the BoardOfDirectors
      contract

**Acceptance Criteria — an election nobody finished:**

- [ ] An election past its end date counts as over even if only some members cast a vote, and can be
      published from wherever it is shown
- [ ] **An election in which nobody voted can still be closed**, which frees the team to run another
      one. Test it on purpose: let an election reach its end date with zero votes, publish it, then
      confirm a new one can be created
- [ ] **With zero votes, nobody is declared a winner** — there is nothing to elect anyone on, so the
      previous board stays in office until a real vote replaces it _(gap: the contract takes the top
      of the candidate list, which with no votes is simply the order they were entered in, and the
      portal shows them as winners — E-07)_
- [ ] While a previous election is waiting to be published, the page says that this is what blocks a
      new one, and offers the action that unblocks it — not just a missing button

**Priority:** P1 · **Effort:** M · **Status:** ⚠️ E-07, E-10, E-14 · **Dependencies:** US-EL-02

---

## US-EL-04 — Be told an election has started

**As a** team member **I want to** be notified when an election starts **So that** I do not miss the
vote because nobody told me

**Acceptance Criteria:**

- [ ] When an election is created, every team member receives "New Election Created — New election
      created you are invited to participate"
- [ ] Opening the notification lands on the Elections page of the right team
- [ ] If the notifications fail to go out, the election still exists and the toast "Failed to send
      election notifications" appears — creating and notifying succeed or fail separately
- [ ] **The message says whether I can cast a vote, until when, and whether I am a candidate**
      _(gap: the same text goes to everyone, including members who cannot vote in this election and
      members who are candidates in it)_
- [ ] _(API)_ Asking for notifications on a team that does not exist returns 404 (the message
      currently reads "Team not fount")
- [ ] _(API, E-11)_ A caller who is not the team owner is rejected clearly, without the endpoint
      reading the board list off the wrong contract

**Priority:** P2 · **Effort:** S · **Status:** ⚠️ Everyone is notified, but with one generic text
(E-11) · **Dependencies:** US-EL-01

---

## US-EL-05 — Know how long I have left to cast my vote

**As an** eligible voter **I want to** see when the election starts, when it ends, and how much time
is left **So that** I can decide whether to cast my vote now or come back later

**Acceptance Criteria:**

- [ ] The election carries a status badge: **Upcoming** (amber) before the start date, **Active**
      (green) while voting is open, **Completed** (grey) afterwards
- [ ] Upcoming and Active carry a countdown that ticks without a reload — days, then hours, then
      minutes, then seconds
- [ ] The start and end dates are also shown as dates, not only as a countdown
- [ ] The badge turns **Completed** as soon as every eligible voter has cast a vote, before the end
      date — a tester should confirm this by having everyone vote early
- [ ] One countdown timer drives the whole page, not one per card
      _([NFR-01](#nfr-01--the-election-pages-stay-cheap-to-open))_

**Priority:** P2 · **Effort:** S · **Status:** ✅ · **Dependencies:** US-EL-01

---

## US-EL-06 — Follow the vote counts while the election runs

**As a** team member **I want to** see how many votes each candidate has received, and how many
members have cast a vote **So that** I can watch the election while it happens, and not only once it
is over

**Acceptance Criteria:**

- [ ] Each candidate shows their vote count and a bar, **labelled for what it actually is** — votes
      for this candidate out of the votes cast so far, not out of the eligible voters _(E-13: today
      it reads "2/5" with no label)_
- [ ] The number of votes cast against the number of eligible voters is shown for the election as a
      whole, so turnout can be read at a glance
- [ ] The counts update after a vote is cast from this browser, without a reload
- [ ] **Nobody is called a winner before the results are published.** Until then, a vote count is a
      vote count _(E-07: today the "Winner" badge appears the moment the countdown reaches zero,
      from counts that are not final — and with no votes at all it marks candidates in the order
      they were entered)_
- [ ] Once published, the winners carry the amber "Winner" badge, not clipped by the card border

**Priority:** P2 · **Effort:** M · **Status:** ⚠️ E-07, E-13 · **Dependencies:** US-EL-02

---

## US-EL-07 — Know who sits on the Board of Directors today

**As a** team member **I want to** see the members of the current Board of Directors **So that** I
know who represents me right now, without reading an election to work it out

**Acceptance Criteria:**

- [ ] The Elections page shows "Current Board of Directors": avatar, name, role and address for each
      member
- [ ] Opening a published election shows "Elected Board of Directors" — the winners of _that_
      election, which is not necessarily the board as it stands today
- [ ] A board member who has left the team is still shown, without breaking the card
- [ ] While loading, the page says so; with no board yet it says "There is no Current Board of
      Directors" and looks empty rather than unfinished (DoD-3) _(E-12)_
- [ ] The grid reflows from five columns down to one on a phone (DoD-4)

**Priority:** P2 · **Effort:** S · **Status:** ✅ · **Dependencies:** US-EL-03

---

## US-EL-08 — Look up a finished election

**As a** team member **I want to** open any finished election and see its candidates, its vote
counts and its winners **So that** anyone can check later how a Board of Directors was chosen —
which is the whole reason this runs on a chain

**Acceptance Criteria:**

- [ ] Finished elections are listed newest first: end date, title, number of directors, total votes,
      elected members
- [ ] "View Results" opens that election with its own candidates, its own counts and its own winners
- [ ] Only elections whose results were published appear here
- [ ] **Every published election is reachable, however old** _(E-09: today only the five most recent
      ids are scanned and at most three are listed — the rest cannot be reached, although the
      contract already exposes `getElectionIds()`)_
- [ ] The number of directors is labelled as such, not as "Candidates" _(E-08)_
- [ ] The winners shown match the counts shown — a reader can add the numbers up and get the same
      board
- [ ] With none yet, the section says "There are no Past Elections" and looks empty rather than
      unfinished (DoD-3) _(E-12)_

**Priority:** P2 · **Effort:** M · **Status:** ⚠️ E-08, E-09, E-12 · **Dependencies:** US-EL-03

---

## US-EL-09 — Be told a new Board of Directors is in place

**As a** team member **I want to** be notified when the results are published **So that** I learn
who represents me without having to visit the page

**Acceptance Criteria:**

- [ ] When the results are published, every team member is notified that a new Board of Directors is
      in office
- [ ] The notification names the elected members and links to that election's results
- [ ] Publishing succeeds even if the notifications fail, and the owner is told they failed — the
      same separation as when an election is created (US-EL-04)
- [ ] Nothing is sent for an election that was cancelled (US-EL-11)

**Priority:** P3 · **Effort:** S · **Status:** ❌ Not built. Creating an election notifies everyone;
publishing its results notifies nobody, and the team finds out by visiting the page ·
**Dependencies:** US-EL-03

---

## US-EL-10 — Cast a vote although I joined the team late

**As a** team member who joined after the election was created **I want** either to be able to cast
a vote, or to be told plainly that this election is not mine **So that** I am not left out without
an explanation, and my absence does not stop the election from finishing

**Acceptance Criteria:**

- [ ] A member who is not an eligible voter sees, on the election itself, that this one is not open
      to them and why _(the minimum, and DoD-1)_
- [ ] The list of eligible voters reflects who is in the team when the election **starts**, not when
      it was created _(needs a contract change: `createElection` fixes the list)_
- [ ] Members who have left the team no longer hold the election open — "everyone has voted" is
      judged against the people who can still vote
- [ ] Whatever the mechanism, the list of eligible voters used for an election stays visible and
      verifiable afterwards: changing who may vote is never invisible

**Priority:** P2 · **Effort:** L · **Status:** ❌ Not built _(E-15)_. The honest first slice is the
explanation; the rest needs a contract decision · **Dependencies:** US-EL-01

---

## US-EL-11 — Cancel an election created by mistake

**As a** team owner **I want to** cancel an election I got wrong — wrong candidates, wrong number of
directors, wrong dates — **So that** the team does not have to vote in it, or wait weeks for it to
end, before we can run the right one

**Acceptance Criteria:**

- [ ] I can cancel the current election, and the team is free to create a new one immediately
- [ ] Members see the election marked as cancelled, with who cancelled it and when — it is not
      deleted from the history
- [ ] Votes already cast in a cancelled election never count towards a board
- [ ] While an election is cancelled, voting and publishing are disabled **in the portal, with an
      explanation** (DoD-1), instead of being left to fail at the wallet
- [ ] Only the owner sees the control

**Priority:** P3 · **Effort:** M · **Status:** 🚫 The contract can be paused and unpaused by its
owner, which freezes creating, voting and publishing — but that aims at the whole contract rather
than one bad election, and nothing in the portal exposes it, so a paused contract reaches members as
failures nobody explains. An `abandonElection` on the contract may be the better answer; this needs
a contract decision first · **Dependencies:** US-EL-01

---

## Non-story work

Real work, but nobody would ask for it as a user — tracked here rather than counted as backlog
value.

### NFR-01 — The election pages stay cheap to open

The pages must read the chain sparingly, so the portal stays fast and inside its RPC budget. This is
what #1415 was opened for.

> **Where the cost actually is.** The transport already batches: every call fired in the same tick
> collapses into one HTTP request (`batch: true` in the wagmi config). So this is not about the
> number of network requests — it is about the number of **contract calls, cached queries, timers
> and re-renders** the page creates for the same data. Measure it in the Vue devtools query list and
> the profiler, not in the network tab.

- [ ] An election with N candidates costs a **bounded** number of chain reads, not a number that
      grows with N _(E-06: each candidate card independently reads whether I voted, who I voted for
      and the counts so far, and mounts the whole election composable — with its two one-second
      timers — for itself; the section then reads one vote count per candidate. Nine candidates ≈
      sixty cached queries for a page that needs a handful.)_
- [ ] Casting a vote refreshes the counts **once**, without refetching the whole page
- [ ] One countdown timer per page, not two per card
- [ ] The same election is fetched once and shared between the view, the section and the cards
- [ ] Moving between the Elections page and the details page reuses what was already read
- [ ] **A hard refresh of either page still shows the election** _(E-03)_

**Priority:** P1 · **Effort:** L · **Affects:** US-EL-02, US-EL-05, US-EL-06

### TECH-01 — All chain access goes through the shared layer

#1415 asks for `useContractWriteV2`. That composable no longer exists — the portal standardised on
the V3 write layer, and the three election writes already use it. What remains is the reads and the
hand-rolled pre-flight checks.

- [x] Creating, voting and publishing go through `composables/elections/writes.ts`
- [ ] Every read goes through `composables/elections`, not one-off calls inside components _(done:
      `ElectionActions`, `ElectionStatus`, `ElectionStats`, the Elections-page section; still
      inline: `BoDElectionDetailsSection`, `BoDElectionDetailsCard`, `PastBoDElectionsSection`,
      `PastBoDElectionCard`, `BodElectionDetailsView`)_
- [ ] No component estimates gas by hand before a write — that manual pre-flight is what produces
      the two different messages in E-10
- [ ] After a write, the affected reads are invalidated through the query cache instead of being
      refetched by hand (E-05, E-06)
- [ ] The elections error catalog covers every contract error, refusals for not being the owner
      included (DoD-2)
- [ ] Dead code is gone: the click-outside handler bound to nothing in the create form, the unused
      results-modal flag, the commented-out blocks in four components _(E-17)_

**Priority:** P1 · **Effort:** M · **Affects:** every story

---

## Defects (issue #1415)

Severity: 🔴 blocks normal use · 🟠 real damage or a dead end · 🔵 performance · 🟡 polish.

| ID   | What is wrong                                                                                                                                                                                                 | Sev | Story       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-: | ----------- |
| E-03 | `BodElectionDetailsView.vue` reads `electionsAddress.value` once and keeps it, so the details page can come up empty after a hard refresh. Partly fixed.                                                      | 🟠  | NFR-01      |
| E-05 | After casting a vote, "Your Vote" and the disabled buttons only appear after a reload — the counter moves but the rest of the page does not.                                                                  | 🟠  | US-EL-02    |
| E-06 | Every candidate card re-reads the same election for itself — whether I voted, who for, the counts so far — plus a full copy of the election composable and its two timers.                                    | 🔵  | NFR-01      |
| E-07 | "Winner" badges appear when the countdown reaches zero, from counts that are not final, before anything is published. With no votes cast, candidates are marked in the order they were entered.               | 🟠  | US-EL-03/06 |
| E-08 | The finished-election card labels the number of directors "Candidates".                                                                                                                                       | 🟡  | US-EL-08    |
| E-09 | Finished elections scan only the five most recent ids and list at most three; older ones cannot be reached, although `getElectionIds()` exists on the contract.                                               | 🟠  | US-EL-08    |
| E-10 | Voting and publishing check the transaction twice — a hand-written gas estimate, then the write layer — so one failure can produce two different messages.                                                    | 🟡  | DoD-2       |
| E-11 | The notification endpoint reads the board list from the elections address using the board's ABI, assuming the elections contract is owned by the board, which it never is. The 404 reads "Team not fount".    | 🟠  | US-EL-04    |
| E-12 | The three empty states are pulsing grey skeletons with a sentence underneath — they read as a page that never finished loading.                                                                               | 🟡  | DoD-3       |
| E-13 | A candidate's vote figure has no label ("2/5") and reads as votes over eligible voters rather than votes over votes cast.                                                                                     | 🟡  | US-EL-06    |
| E-14 | The "Publish Results" button is tagged in the tests as the create-election button.                                                                                                                            | 🟡  | US-EL-03    |
| E-15 | The list of eligible voters is fixed when the election is created and cannot be changed. Newcomers cannot vote and are never told why, and one inactive member means the election can only end by timing out. | 🟠  | US-EL-10    |
| E-16 | The form demands at least three directors while the contract accepts any odd number from 1. Partly fixed — the odd-number rule is now explained up front.                                                     | 🟡  | US-EL-01    |
| E-17 | Dead code: a click-outside handler bound to a ref that is never attached, an unused results-modal flag, commented-out blocks in four components.                                                              | 🟡  | TECH-01     |
| E-18 | Hard-coded light-mode colours across the stat tiles, candidate cards and finished-election cards.                                                                                                             | 🟡  | DoD-4       |

**Fixed on 2026-08-20.** _E-01_ — the end date the owner picked was thrown away and the election
rewritten to last one minute; the form now takes a day **and** a time for both dates. _E-02_ — the
start date was worked out when the modal opened, so a form left open produced a start already in the
past. _E-04_ — "Publish Results" existed only on the details page, leaving an owner on the Elections
page no way to unblock the team.

**Order of work.** E-03 first, then E-05 and E-06 — the performance brief the issue was opened for.
Then E-07 (nobody is a winner before the results are published) and E-09 (older elections
reachable). E-15 needs a contract decision; ship the explanation half now. The 🟡 rows are a single
cleanup pass.

---

_[← Elections contract](../contracts/elections/README.md)_ ·
_[Payroll user stories](../payroll/Readme.md)_
