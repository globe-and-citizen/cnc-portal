# Wage scheduling — how a rate change lands on a week

**Last updated:** 2026-08-15 **Issue:** #2479 **Scope:** backend wage resolution, `GET /wage`,
`GET /team/:id`, member table and claim views.

## The rule, in one line

**A week that holds submitted hours keeps the wage they were priced against; a week with no hours in
it takes the change whole.**

Everything below follows from that.

---

## Why the feature exists

Wages are a linked list: each row points at its successor through `nextWageId`, and the row with
`nextWageId IS NULL` is the end of the chain. Before this change, every lookup treated that leaf as
"the current wage", and `setWage` appended a new leaf immediately.

That broke as soon as a wage changed mid-week:

1. The member had already submitted claims, so a `WeeklyClaim` existed under the old wage.
2. `setWage` appended the new wage and the old one stopped being the leaf.
3. The next claim no longer found the existing `WeeklyClaim` — it is keyed `[wageId, weekStart]` —
   so a **second** one was created for the same week under the new wage.

The consequences were the interesting part:

- **Hour caps were bypassed.** The weekly and daily counters restarted from zero because the hours
  already claimed sat on the other row.
- **The owner saw the week twice** in the approval list.
- **Two EIP-712 signatures** were produced for one week, at two different rates, meaning two
  on-chain withdrawals.

## The rule in practice

Four mechanisms, and they only work together.

### 1. One week, one row

A claim finds its week by `[teamId, memberAddress, weekStart]` — never by wage. One week therefore
always has one row, and the split that produced this issue has nowhere to happen. No invariant about
Mondays is needed for that to hold. Weekly goals use the same lookup.

### 2. Submitted hours commit a week to a wage; nothing else does

When the row already holds claims, the wage recorded on it is what prices and caps the week,
whatever the owner has saved since.

When it holds no claims — an empty week, or a row carrying only weekly goals — nothing has been
priced yet, so the week follows the change like any untouched week: the first hours are priced at
the wage in force and the row moves onto it. Goals are a note to self, not a commitment.

This is the whole of the reviewed rule: a member who had not submitted their hours before the change
is impacted by it, and that is left to them and the owner to sort out.

### 3. A change waits only when it has to

`setWage` looks at the member's current week:

| State of the current week | `effectiveFrom`                  |
| ------------------------- | -------------------------------- |
| Holds submitted hours     | Next Monday 00:00 UTC            |
| No hours in it            | **This** week's Monday 00:00 UTC |

Note what `effectiveFrom` is **not** in the immediate case: it is not "now". Resolution compares the
effective date against the _start_ of the week (below), so a mid-week timestamp would exclude the
new wage from the very week it is meant to cover.

Both branches return a Monday, so a wage boundary is always a week boundary and exactly one wage
covers any week. A member's **first** wage follows the same rule and lands on the current Monday.

The consequence to be aware of: **a wrong rate cannot be corrected in-week once hours are in.** If
the owner saves 2.5 instead of 25 and someone has already submitted, that member is paid at 2.5
until Sunday. Members who have submitted nothing are corrected right away.

### 4. Resolution is done per week, not per "now"

`resolveWageForWeek(teamId, userAddress, weekStart)` walks the chain and returns the last wage whose
effective date is at or before `weekStart`, where

```text
effective date = effectiveFrom ?? createdAt
```

`createdAt` is the fallback for rows written before `effectiveFrom` existed; those wages did take
effect the moment they were created.

Anchoring changes to Mondays is what makes this exact: a wage boundary and a week boundary are the
same instant, so **exactly one wage covers any week**. Resolving on "now" instead would price a
backdated claim at today's rate — see [Case B](#b--backdating-into-an-earlier-week) below.

### One rule, one implementation

`pickWageForWeek` is the pure function that decides, for weeks with no hours in them yet. Everything
else calls it:

| Caller              | Purpose                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `addClaim`          | Wage a daily claim is priced and capped against, **unless the week already holds hours** |
| `submitWeeklyGoals` | Wage a goals row is created with, when the week does not exist yet                       |
| `GET /wage`         | Rates and caps the claim form validates against                                          |
| `GET /team/:id`     | `currentWage` in the member table                                                        |

This matters more than it looks. Deriving the displayed wage as "the leaf, unless scheduled" _seems_
equivalent, and it is for rows written by this feature — but not for legacy rows, where
`effectiveFrom` is `null` and `createdAt` falls mid-week. There the leaf would be shown as current
while claims for the same week were still priced on its predecessor. The screen and the server would
disagree about what the member earns.

`splitCurrentAndScheduled` returns both halves — the wage in force and the change queued behind it —
from that same function, so the two cannot drift.

---

## Cases

### A — The current week

| Situation                                     | Behaviour                                                          |
| --------------------------------------------- | ------------------------------------------------------------------ |
| No change                                     | The chain's only operative wage applies                            |
| Change saved, member has submitted hours      | Scheduled for next Monday; **this week keeps the current wage**    |
| Change saved, member has submitted no hours   | Applies from this week's Monday, to the whole week                 |
| Change saved, member has only set their goals | Same: goals commit nothing, the week takes the change              |
| Member submits **after** an immediate change  | Their week is priced at the new wage, days already worked included |
| Member's first wage ever                      | Applies from this week's Monday                                    |
| Wage is disabled                              | `setWage` refused (400); claims refused                            |

Rows three to five are the deliberate cost of the rule: the owner who changes a wage before their
member submits repriced that member's week. Waiting for the submission is the way out. Nothing is
announced when it happens — the week is simply priced at the new wage, and there is no pending state
to describe.

### B — Backdating into an earlier week

Only reachable when `SUBMIT_RESTRICTION` is `disabled` or `beta`. When active (the default,
including when unconfigured) `dayWorked` is confined to the current ISO week, at most 4 days back,
so a claim can never cross a week boundary.

| State of the target week      | Behaviour                                                       |
| ----------------------------- | --------------------------------------------------------------- |
| `WeeklyClaim` exists, pending | Joins it; caps recount against **that row's** wage              |
| `WeeklyClaim` signed          | `409 Week already signed`                                       |
| `WeeklyClaim` withdrawn       | `409 Week already withdrawn`                                    |
| `WeeklyClaim` disabled        | `409 Week is disabled`                                          |
| No `WeeklyClaim` yet          | A new one is created, priced at the wage that covered that week |

The last row is intentional. A member who simply **forgot** to submit for earlier weeks must be able
to catch up, and that is indistinguishable from "reopening" a week at the data level. The catch-up
follows the normal cycle: the owner still approves it.

What makes this safe is that the claim lands on the week's existing row instead of opening a rival
one, and is priced by that row — so caps and rates are the ones the hours already in it were
measured against.

### C — The owner made a mistake

| Situation                         | Behaviour                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| Corrects before Monday            | The scheduled row is **rewritten in place** — no new link in the chain                       |
| Corrects several times            | Still one rewrite each time; the chain stays two links long                                  |
| Effective date after a correction | **Recomputed** — see below                                                                   |
| Wants to call it off              | `DELETE /wage/scheduled` removes the row and restores `nextWageId = null` on the predecessor |
| Corrects after it took effect     | Normal path: a new wage scheduled for the following Monday                                   |

Rewriting in place is safe precisely because a scheduled wage has never been operative — no claim,
no `WeeklyClaim`, no signature references it.

The effective date is recomputed on every save rather than preserved, because the reason a change
waits can disappear: the week's hours can be withdrawn, or the change can have been queued under an
older rule. A wait that outlives its reason cannot be released by any other route, since the change
is not visible as an editable row anywhere. Recomputing can only pull the date **forward** to the
current Monday — a week that still holds hours yields the same next Monday it did before — so a
correction never pushes the change back a week.

### D — Boundaries

| Situation                              | Behaviour                                        |
| -------------------------------------- | ------------------------------------------------ |
| Week predates the member's first wage  | Falls back to the **earliest** wage in the chain |
| Chain is broken (no predecessor found) | Falls back to the leaf rather than failing       |
| Two wages share an effective date      | Highest `id` wins — ids increase along the chain |
| Member has no wage at all              | `400 No wage found for the user`                 |

The first row deserves its reasoning. Rejecting would be more principled, but on existing data
`createdAt` is a technical timestamp and not a business start date: a wage row written in June can
legitimately cover weeks in May that were already claimed. Rejecting would break that history, so
the earliest wage is used instead.

---

## What changes with the daily cap

`maximumHoursPerDay` is a field on the wage like the rate, so it follows exactly the same rule.
Tightening it does **not** touch a week the member has already submitted hours for — the old ceiling
holds until Sunday and the new one applies from Monday — while a week with no hours in it is
measured against the new ceiling from its own Monday. A backdated claim is measured against the
ceiling carried by the week it targets.

The same holds for `maximumHoursPerWeek` and the overtime settings.

---

## API surface

### `GET /wage?teamId=`

Returns the wage **in force now** per member, with any pending change attached:

```jsonc
[
  {
    "id": 1,
    "ratePerHour": [{ "type": "sher", "amount": 5 }],
    "maximumHoursPerWeek": 20,
    "maximumHoursPerDay": 8,
    "effectiveFrom": null,
    // The Monday a change saved right now would take effect on. This week's
    // when the member has submitted no hours, next week's when they have.
    "nextChangeEffectiveFrom": "2026-08-17T00:00:00.000Z",
    "scheduledWage": {
      // null when nothing is pending
      "id": 2,
      "ratePerHour": [{ "type": "sher", "amount": 10 }],
      "maximumHoursPerWeek": 15,
      "maximumHoursPerDay": 8,
      "effectiveFrom": "2026-08-17T00:00:00.000Z",
    },
  },
]
```

The top-level object is what the claim form must validate against. Returning the scheduled wage
there would make the form accept hours the server then rejects.

`nextChangeEffectiveFrom` is what tells the modal whether to warn at all, and with which date. The
front end cannot know whether a member has submitted hours, and a rule implemented twice is a rule
that drifts.

### `PUT /wage/setWage`

- `201` with the new wage — scheduled for next Monday, or effective from this week's Monday when the
  member has submitted no hours; `effectiveFrom` on the response says which
- `200` with the rewritten wage when a scheduled change is corrected in place
- `400` when the operative wage is disabled

### `DELETE /wage/scheduled?teamId=&userAddress=`

- `200` with the wage that stays in force
- `404` when there is no scheduled change
- `409` when the scheduled wage has no predecessor (broken chain)

### `GET /team/:id`

Each member carries `currentWage` and `scheduledWage`, resolved the same way.

---

## What the user sees

| Surface              | Content                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| Member table (owner) | Badge under the rate: `Changes to SHER 10/h, 15h/wk, 8h/d on Aug 17, 2026` |
| Set-wage modal       | Banner **only when the change has to wait**, stating the date              |
| Claim view (member)  | Same notice, **only on weeks that predate the change**                     |

Nothing is shown when the change takes effect straight away, and that is on purpose. There is no
pending state to describe: the member's week is simply priced at the new wage. Announcing it would
put a notice on the common path to say that saving a wage saved the wage.

Every surface here therefore describes the same single thing — a change that is waiting — which is
also why they all key off `scheduledWage` being present.

The last condition matters: on the week the change takes effect, that week already runs on the new
wage, so announcing it as upcoming — and saying the week keeps the current rate — would be false.

The rate label always shows the chain's ticker for `native` (via `rateSymbol`), never the raw
`NATIVE` database value, and lists the hour ceilings alongside the rate, since those usually change
together.

### Switching over at the deadline

No polling. `useScheduledWageRefresh` arms one timer for the exact moment the change becomes
operative and invalidates the wage and team queries. Because a tab left open over a weekend can have
its timers throttled, the queries are also invalidated when the document becomes visible again past
the effective date.

---

## Data model

```prisma
model Wage {
  effectiveFrom DateTime?   // null = took effect on creation
  nextWageId    Int? @unique
  // ...
  @@index([teamId, userAddress])
}
```

- `effectiveFrom` is nullable, so existing rows keep their exact behaviour.
- The deferrable `Wage_active_unique` EXCLUDE constraint still guarantees one leaf per
  `(teamId, userAddress)`; chaining runs inside a transaction so the check happens at COMMIT.
- The `(teamId, userAddress)` index backs chain resolution, which now runs on every claim and every
  weekly-goals submission.

### Migrations

| Migration                                | Effect                                   |
| ---------------------------------------- | ---------------------------------------- |
| `20260812000000_wage_effective_from`     | Adds the nullable `effectiveFrom` column |
| `20260812010000_wage_member_chain_index` | Adds the `(teamId, userAddress)` index   |

Both are additive and backward compatible — no backfill, no downtime. On deployment every existing
wage has `effectiveFrom = null` and keeps behaving as it did.

---

## Known gaps

- The **Overtime Wage** column shows no indicator when an overtime change is scheduled, even though
  the badge in the Standard column already covers the same wage row.
- There is no way to schedule a change for a week **further out** than the next Monday.
- Nothing at the database level forbids two `WeeklyClaim` rows for one member-week: the uniqueness
  is `[wageId, weekStart]`, and it is the lookup in `addClaim` that makes a second row unreachable.
  A `[teamId, memberAddress, weekStart]` unique index would make it structural, but the migration
  has to dedupe rows the original bug may already have created in production.
- A week with no hours in it is priced by resolution, so a forgotten past week is paid at the wage
  that covered it — not at the wage in force when they finally submit. That is the intended reading
  of "the week worked determines the wage", but it is worth knowing it is a choice.
- `WeeklyClaim.status` is nullable on legacy rows. `weekHasClaims` counts rows holding claims rather
  than filtering on `status: 'pending'`; a status filter added later would silently miss them.
- A goals-only row keeps pointing at its original wage until the first hours arrive. Nothing is
  priced against it in the meantime, so this is invisible — but a screen reading the wage off a
  goals-only week would show a superseded one.

---

_[← Back to payroll user stories](./Readme.md)_
