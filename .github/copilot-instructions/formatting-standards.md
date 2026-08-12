# Display Formatting Standards

**One rule: never format a value by hand. Ask the canonical module for a named style.**

- `app/` → `import { formatUsd } from '@/utils/format'`
- `dashboard/` → `import { formatUsd } from '~/utils/format'`

ESLint enforces this. The rationale, the API, and what to do when the module doesn't cover your case
are below.

---

## Why this exists

Before this module, `app/src` alone carried:

- **four** ways to render a date — `dayjs` with 14 distinct pattern strings,
  `toLocaleString('en-US')`, `Intl.DateTimeFormat`, and a hand-rolled `String.replace` on
  `dd/MM/yyyy`;
- **five strictly identical** transaction-date helpers, one per domain (`formatBankTransactionDate`,
  `formatExpenseTransactionDate`, …), each `new Date(ts * 1000).toLocaleString('en-US')`;
- **three** money conventions with different decimal policies, only one of which avoided rendering a
  negative zero as `$-0.00`;
- **five** address truncations, two using `…` where the rest used `...`, so the same address looked
  like two different values in two tables.

That is not a tidiness problem. [#2376](https://github.com/globe-and-citizen/cnc-portal/pull/2376)
shipped to production: a `maximumFractionDigits: 0` default plus raw `toLocaleString` at the call
sites rounded every fractional Community Credit amount to a whole number, so a `0.2 USDC` position
displayed as `0`.

A formatter is a **product decision** — how much precision a user is trusted with, whether zero
means zero or unknown, whether a figure is reconcilable against a block explorer. Decisions like
that belong in one reviewed place, not re-derived per call site.

---

## The API

Same surface in both front-ends (`app/src/utils/format/`, `dashboard/app/utils/format/`).

### Money and numbers

| Helper                                                      | Renders                | Use for                                                                          |
| ----------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `formatUsd(value, { decimals = 2 })`                        | `$1,234.50`, `-$12.30` | Any USD figure. Fixed decimals, so columns align. `decimals: 6` for unit prices. |
| `formatToken(value, symbol, { maxDecimals = 4 })`           | `1,234.5 USDC`         | Token amounts. Variable precision — trailing zeros trimmed.                      |
| `formatNumber(value, { minDecimals = 0, maxDecimals = 4 })` | `1,234.5`              | Counts, quantities, anything unitless.                                           |
| `formatCompact(value, { currency = 'USD' })`                | `$1.2M`                | Tiles and chart axes, where magnitude is the message.                            |
| `formatPercent(ratio, { decimals = 2, signed })`            | `12.50%`, `+5.0%`      | Takes a **ratio, not percentage points**: `0.125` → `12.5%`.                     |

### Dates

| Helper                      | Renders                 | Use for                                                                    |
| --------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `formatDate(value)`         | `Jan 8, 2026`           | The default for a date shown on its own.                                   |
| `formatDateTime(value)`     | `Jan 8, 2026, 14:05:32` | Chronologically ordered rows — same-day entries must stay distinguishable. |
| `formatDateShort(value)`    | `Jan 8`                 | Chart axes, dense tables where the year is established.                    |
| `formatMonthYear(value)`    | `January 2026`          | Period headers.                                                            |
| `formatDateIso(value)`      | `2026-01-08`            | Filenames, CSV columns, API payloads — never UI copy.                      |
| `formatDateUtc(value)`      | `2026-01-08 14:05 UTC`  | Anything a user lines up against a block explorer or a deadline.           |
| `formatDateRelative(value)` | `3 min ago`             | Freshness cues. Falls back to `formatDate` past a week.                    |
| `formatDuration(minutes)`   | `1 h 30 min`            | Elapsed spans. Never `01:30`, which reads as a clock time.                 |
| `fromUnix(seconds)`         | a `Dayjs`               | On-chain timestamps. **Use this instead of `* 1000`.**                     |

A bare `number` passed to a date formatter is **milliseconds** (the JavaScript convention). Contract
timestamps are seconds — `formatDate(fromUnix(ts))`, not `formatDate(ts * 1000)`.

### Addresses and hashes

| Helper                                           | Renders                          |
| ------------------------------------------------ | -------------------------------- |
| `formatAddress(address, { lead = 6, tail = 4 })` | `0x4b6f...6F70`                  |
| `formatTxHash(hash)`                             | same shape, named for the intent |

Values already short enough to read whole come back untouched. Display only — never feed a truncated
value into a contract call or a comparison.

---

## Conventions the module encodes

**Locale is pinned to `en-US`.** Not the browser's: a `1,234.50` that becomes `1.234,50` for one
teammate makes screenshots, exports and support threads unreadable, and the surrounding copy is
English-only anyway.

**Nothing renderable → `EMPTY_VALUE` (`—`), never `0`.** A zero is a claim about the data. Rendering
`$0.00` for a balance that is merely still loading is how an empty wallet gets reported as a bug.

**A value that rounds to zero renders as a clean zero.** `-0.004` at cent precision is `$0.00`, not
`-$0.00`.

**Money is fixed-precision, tokens are not.** `$5` and `$5.20` in the same column is a misread
waiting to happen, so USD pads. `0.0001 SHER` and `0.00 SHER` are different claims, so tokens trim.

---

## What ESLint blocks

Outside `utils/format/`, these are errors (in `<script>` **and** in `<template>`):

| Banned                                                                | Instead                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `new Intl.NumberFormat(...)`, `new Intl.DateTimeFormat(...)`          | the helper for the style you want                                         |
| `.toLocaleString()`, `.toLocaleDateString()`, `.toLocaleTimeString()` | same                                                                      |
| `.toFixed(n)`                                                         | `formatNumber` / `formatUsd` for display — see below for on-chain amounts |
| `.format('MMM D, YYYY')` — a literal dayjs pattern                    | a named date helper                                                       |

`.format(value)` with a non-literal argument stays allowed: that's a formatter instance being
called, not a pattern being invented.

Specs are exempt — a test may assert against a natively formatted expectation.

### `toFixed` before `parseUnits` is a bug, not a style issue

```ts
parseUnits(amount.toFixed(decimals), decimals); // ❌ silently changes the amount transacted
```

Rounding a value _before_ converting it on-chain means the user signs a different number than the
one they entered. Pass the unrounded value. Formatting is what you do to show a number to a human —
never to prepare one for a contract.

---

## When the module doesn't cover your case

**Extend it.** Add the named style to `utils/format/`, with a test and a one-line doc comment saying
when to reach for it. Then use it in both front-ends.

Do **not** add a file to the `formattingLegacyFiles` allowlist in `eslint.config.js` /
`eslint.config.mjs`. That list is migration debt from
[#2383](https://github.com/globe-and-citizen/cnc-portal/issues/2383) and only ever shrinks — a
ceiling constant fails lint at config load if it grows. A new entry means the codebase gained a
convention in the same week it spent a PR removing them.

If a one-off truly is one-off, a scoped
`// eslint-disable-next-line no-restricted-syntax -- <reason>` on the line itself is the escape
hatch. The reason is mandatory; "legacy" is not a reason.

**Keep the two implementations identical.** `app/` and `dashboard/` render the same figures for the
same teams. There is no shared package to hold the module yet, so duplication is the price — any
change lands in both.

---

## Review checklist

- [ ] No `Intl.*`, `toLocaleString`, `toFixed`, or literal dayjs pattern outside `utils/format/`
- [ ] On-chain amounts reach `parseUnits` unrounded
- [ ] Unknown / loading values render `—`, not `0`
- [ ] A new named style landed in **both** front-ends, with a test
- [ ] `formattingLegacyFiles` did not grow
