# Daily cap — wage daily hour limit

Displays each member's maximum claimable hours per day directly in the Team
Members table and enforces the limit in the claim form before submission, so the
member sees and corrects the error without waiting for a backend rejection.

---

## Badge in the Team Members table — 2026-08-11

Adds a pill badge next to the weekly cap in the **Standard Wage** column. The
badge only renders when `maximumHoursPerDay` is set on the wage; otherwise the
cell is unchanged.

### Badge — entry points

- Team Members table, **Standard Wage** column
  ([`MemberSection.vue`](../../../app/src/components/sections/DashboardView/MemberSection.vue))

### Badge — data source

`maximumHoursPerDay` is an optional field on the
[`Wage` type](../../../app/src/types/cash-remuneration.ts)
(`number | undefined`). The backend stores it in the `Wage` table
([Prisma schema](../../../backend/prisma/schema.prisma), column
`maximumHoursPerDay`, default `8`) and returns it on every wage
response — no new endpoint needed.

### Badge — frontend behaviour

The `#standard-cell` slot in `MemberSection.vue` renders:

```text
● GO 12
● SHER 0.1
40h/wk  [🕐 8h/d]
```

- **Weekly cap** (`Xh/wk`) — existing behaviour, displayed when
  `maximumHoursPerWeek` is set.
- **Daily cap badge** (`Xh/d`) — amber pill with a clock icon, displayed
  when `maximumHoursPerDay` is truthy.

The badge uses Tailwind utility classes (no scoped CSS):

| Property   | Value                                              |
| ---------- | -------------------------------------------------- |
| Background | `bg-[#FAEEDA]` (amber-50)                          |
| Text       | `text-[#854F0B]` (amber-800)                       |
| Font       | `text-[11px] font-medium`                          |
| Shape      | `rounded-full`, `px-2 py-0.5`                      |
| Icon       | `i-heroicons-clock`, `size-3`, `aria-hidden="true"` |

Accessibility: the badge carries a `title` attribute
(`Daily limit: X hours`).

### Badge — conditional rendering

| State                | Rendered                       |
| -------------------- | ------------------------------ |
| Weekly cap + daily cap | `40h/wk` then badge `8h/d`  |
| Weekly cap only      | `40h/wk` (no badge)           |
| Daily cap only       | badge only                     |
| Neither cap          | nothing in the caps line       |
| No wage at all       | `—`                            |

### Badge — tests

[`MemberSection.spec.ts`](../../../app/src/components/sections/DashboardView/__tests__/MemberSection.spec.ts):

- `shows daily cap badge when maximumHoursPerDay is set` — Alice's row
  (`maximumHoursPerDay: 8`) renders `8h/d` with the correct `title`.
- `hides daily cap badge when maximumHoursPerDay is not set` — Bob's
  row (no `maximumHoursPerDay`) has no `[data-test="daily-cap-badge"]`.

---

## Client-side hours validation against daily cap — 2026-08-11

Mirrors the backend's `dailyLimitMinutes()` guard in the frontend claim
form so the user gets an inline error on the **Hours worked** field and
can correct it immediately.

### Validation — entry points

- Submit Claim modal
  ([`SubmitClaims.vue`](../../../app/src/components/sections/CashRemunerationView/SubmitClaims.vue)
  →
  [`ClaimForm.vue`](../../../app/src/components/sections/CashRemunerationView/Form/ClaimForm.vue))
- Edit Claim form
  ([`EditClaims.vue`](../../../app/src/components/sections/CashRemunerationView/EditClaims.vue)
  → `ClaimForm.vue`)

### Validation — data flow

```text
ClaimHistoryActionAlerts
  └─ extracts maximumHoursPerDay from the user's Wage
  └─ passes it as prop to SubmitClaims
       └─ passes it as prop to ClaimForm
            └─ passes it to useClaimForm({ maximumHoursPerDay })

EditClaims
  └─ extracts maximumHoursPerDay from claim.wage
  └─ passes it as prop to ClaimForm
```

### Validation — backend behaviour (existing, unchanged)

[`claimController.ts`](../../../backend/src/controllers/claimController.ts)
— `dailyLimitMinutes()` caps minutes per day at
`maximumHoursPerDay × 60` (or falls back to a system default). Claims
that exceed the daily limit are rejected with a `400`.

### Validation — frontend behaviour

[`useClaimForm.ts`](../../../app/src/composables/useClaimForm.ts) — the
Zod schema is now built by `buildClaimSchema(dailyCap?)`, a factory
function that produces rules adapted to the cap:

| Validation         | Without daily cap          | With cap (e.g. 6)          |
| ------------------ | -------------------------- | -------------------------- |
| Hours field max    | `Cannot exceed 24 hours`   | `Cannot exceed 6 hours`    |
| Total duration max | `Cannot exceed 24 hours…`  | `Cannot exceed daily cap…` |
| Total duration min | `Duration must be > 0`     | *(unchanged)*              |

The schema is a `computed` inside `useClaimForm`, so it reacts if the
wage changes while the form is open.

**Prop chain added:**

| Component                    | New prop                                    |
| ---------------------------- | ------------------------------------------- |
| `ClaimForm.vue`              | `maximumHoursPerDay?: number`               |
| `SubmitClaims.vue`           | `maximumHoursPerDay?: number`               |
| `ClaimHistoryActionAlerts.vue` | extracts from `userWage.maximumHoursPerDay` |
| `EditClaims.vue`             | extracts from `claim.wage.maximumHoursPerDay` |

### Validation — happy paths

1. **Cap respected** — member with a 8h daily cap enters 7h 30min →
   form validates, claim submits normally.
2. **Hours exceed cap** — member enters 9h 0min with a 8h cap → inline
   error `Cannot exceed 8 hours` appears under "Hours worked" before
   submission.
3. **Total exceeds cap** — member enters 7h 50min with a 6h cap (total
   470 min > 360 min) → inline error
   `Cannot exceed daily cap of 6 hours`.
4. **No cap configured** — validation falls back to the 24h absolute
   ceiling.

### Validation — edge cases

- **`maximumHoursPerDay` is `0` or `undefined`** — treated as "no cap",
  validation falls back to 24h.
- **Cap changes while the modal is open** — the computed schema updates;
  the next field blur or submit attempt applies the new limit.
- **Backend still enforces** — the frontend validation is an
  early-feedback mirror, not a replacement. The backend
  `dailyLimitMinutes()` remains the authority.

### Validation — tests

[`useClaimForm.spec.ts`](../../../app/src/composables/__tests__/useClaimForm.spec.ts):

- `enforces daily cap when maximumHoursPerDay is provided` — schema
  rejects hours above the cap and total minutes above the cap, with the
  correct messages.
- `falls back to 24h limit when no daily cap is set` — 23h 50min passes
  validation.

---

## Remaining daily allowance validation — 2026-08-11

Extends the daily cap validation to account for hours the member has
already submitted for the selected day. Instead of checking only against
the raw cap, the schema compares `input + already claimed` against the
cap and surfaces a detailed inline error on the **Hours worked** field.

### Remaining allowance — entry points

- Submit Claim modal
  ([`ClaimHistoryActionAlerts.vue`](../../../app/src/components/sections/ClaimHistoryView/ClaimHistoryActionAlerts.vue)
  →
  [`SubmitClaims.vue`](../../../app/src/components/sections/CashRemunerationView/SubmitClaims.vue)
  →
  [`ClaimForm.vue`](../../../app/src/components/sections/CashRemunerationView/Form/ClaimForm.vue))

### Remaining allowance — data flow

```text
ClaimHistoryActionAlerts
  └─ passes weeklyClaim.claims as existingClaims prop to SubmitClaims
       └─ passes existingClaims prop to ClaimForm
            └─ passes existingClaims to useClaimForm({ existingClaims })
                 └─ buildClaimSchema(dailyCap, existingClaims) adds
                    .superRefine() that sums already-claimed minutes
                    for the selected dayWorked
```

### Remaining allowance — frontend behaviour

[`useClaimForm.ts`](../../../app/src/composables/useClaimForm.ts) —
`buildClaimSchema(dailyCap?, existingClaims?)` now accepts an optional
array of `DailyClaimEntry` (type exported from the composable):

```ts
export interface DailyClaimEntry {
  minutesWorked: number
  dayWorked: string
}
```

A `.superRefine()` step runs after the field-level and total-duration
checks:

1. Skipped when there is no daily cap or no existing claims.
2. Sums `minutesWorked` of all claims whose `dayWorked` matches the
   form's selected day (`alreadyClaimedForDay()`).
3. If `inputMinutes + claimedMinutes > capMinutes`, attaches a detailed
   error to the `hoursWorked` path:
   ```
   Daily limit would be exceeded. Allowance: 8h. Already claimed: 7h. Remaining: 1h.
   ```
4. Minutes are formatted with `formatMinutes()` — e.g. `7h30min` when
   there is a non-zero minute portion.

**Prop chain added (on top of the previous `maximumHoursPerDay` chain):**

| Component                      | New prop / option                         |
| ------------------------------ | ----------------------------------------- |
| `useClaimForm.ts`              | `existingClaims?: Ref<DailyClaimEntry[]>` |
| `ClaimForm.vue`                | `existingClaims?: DailyClaimEntry[]`      |
| `SubmitClaims.vue`             | `existingClaims?: Pick<Claim, 'minutesWorked' \| 'dayWorked'>[]` |
| `ClaimHistoryActionAlerts.vue` | passes `weeklyClaim?.claims`              |

### Remaining allowance — happy paths

1. **Under remaining** — 7h already claimed today with 8h cap, member
   enters 0h 30min → validates, submits normally.
2. **Exactly at cap** — 7h already claimed, member enters 1h 0min
   (total = 8h) → validates.
3. **Over remaining** — 7h already claimed, member enters 2h 0min
   (total = 9h > 8h) → inline error with breakdown.
4. **Different day** — 7h claimed on Monday, member selects Tuesday
   and enters 2h → no overlap, validates.

### Remaining allowance — edge cases

- **No existing claims** — the `.superRefine()` short-circuits; only
  the raw-cap validation applies.
- **No daily cap** — the `.superRefine()` short-circuits; no
  remaining-allowance check runs.
- **Claims list updates** — `existingClaims` is reactive (via `toRef`);
  if the list updates while the form is open the schema recomputes.
- **Edit flow** — `EditClaims.vue` does not yet receive
  `existingClaims` because the claims list is not threaded through
  `ClaimActions`. The raw daily-cap validation still applies.

### Remaining allowance — tests

[`useClaimForm.spec.ts`](../../../app/src/composables/__tests__/useClaimForm.spec.ts):

- `rejects when input plus already-claimed minutes exceed the daily cap`
  — 7h claimed + 2h input on the same day → rejected; error message
  contains `Already claimed: 7h` and `Remaining: 1h`. Same input on a
  different day → passes. Exactly at cap (7h + 1h) → passes.

---

## Implementation map

| Layer              | File                          | Role                       |
| ------------------ | ----------------------------- | -------------------------- |
| Database           | [`schema.prisma`][prisma]     | `maximumHoursPerDay` col   |
| Migration          | [`migration.sql`][migration]  | Adds the column            |
| Backend validation | [`wage.ts`][wage-schema]      | Zod schema for create/update |
| Backend enforcement | [`claimController.ts`][claim] | `dailyLimitMinutes()` guard |
| Type               | [`cash-remuneration.ts`][type] | `maximumHoursPerDay?` on `Wage` |
| Set Wage modal     | [`SetMemberWageStandardStep.vue`][set-wage] | Input field    |
| Table badge        | [`MemberSection.vue`][member] | Amber pill in Standard Wage |
| Form validation    | [`useClaimForm.ts`][form]     | `buildClaimSchema(dailyCap?)` |
| Claim form         | [`ClaimForm.vue`][claim-form] | Accepts the prop           |
| Submit flow        | [`SubmitClaims.vue`][submit]  | Forwards prop              |
| Edit flow          | [`EditClaims.vue`][edit]      | Extracts from `claim.wage` |
| Claim history      | [`ClaimHistoryActionAlerts.vue`][alerts] | Extracts from wage query |

[prisma]: ../../../backend/prisma/schema.prisma
[migration]: ../../../backend/prisma/migrations/20260724090000_wage_maximum_hours_per_day/migration.sql
[wage-schema]: ../../../backend/src/validation/schemas/wage.ts
[claim]: ../../../backend/src/controllers/claimController.ts
[type]: ../../../app/src/types/cash-remuneration.ts
[set-wage]: ../../../app/src/components/sections/DashboardView/SetMemberWageStandardStep.vue
[member]: ../../../app/src/components/sections/DashboardView/MemberSection.vue
[form]: ../../../app/src/composables/useClaimForm.ts
[claim-form]: ../../../app/src/components/sections/CashRemunerationView/Form/ClaimForm.vue
[submit]: ../../../app/src/components/sections/CashRemunerationView/SubmitClaims.vue
[edit]: ../../../app/src/components/sections/CashRemunerationView/EditClaims.vue
[alerts]: ../../../app/src/components/sections/ClaimHistoryView/ClaimHistoryActionAlerts.vue

---

*[← Back to Cash Remuneration](../contracts/cash-remuneration/README.md)*
