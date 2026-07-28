# Contract-artifact versions

Deployment-aligned snapshots of the CNC contract ABIs and deployed addresses on
Polygon (chain 137), **matched to the four real prod `Officer#FactoryBeacon`
generations** (the ones detected on-chain across live teams). For each, the
**ABIs are recompiled at the deploy commit** (authoritative — committed ABIs and
the raw git deploy log are unreliable) and the **deployed addresses are taken
from git** at that commit.

This replaces the earlier `v1` placeholder (frozen from `HEAD`) and an initial
mis-pick that pointed V0/V0.1 at a `0x8aC4…` generation which has no live teams.

Version names stay short (`V0`, `V0.1`, `V1`, `V2`); they are **four distinct
full redeployments** (each a new Officer + factory beacon).

## Versions

| version | Officer#FactoryBeacon | Officer#Officer  | deploy commit | ~date   |
| ------- | --------------------- | ---------------- | ------------- | ------- |
| `V0`    | `0x2d92…F374`         | `0xb5D4BC…D33f`  | `a8c6f815b`   | 2026-02 |
| `V0.1`  | `0x0205…a6A0`         | `0xCCa727…Ff08`  | `d79baeaaf`   | 2026-04 |
| `V1`    | `0x91EB…F1dE`         | `0xa90C…4615`    | `9613f0882`   | 2026-04 |
| `V2`    | `0xF426…0FFc`         | `0x870BF…82a3bA` | `026a2377b`   | 2026-07 |

`current` in `registry.json` = `V2` (the factory beacon live on `develop`).
`0x0205…` (V0.1) is the one Ponder pins as the prod factory.

V2 also renamed the Investor beacon (`InvestorsV1BeaconModule` →
`InvestorBeaconModule`, dropping the "V1" suffix — see
`contract/UPGRADE_STRATEGY.md`), converted `Vesting` from a transparent proxy to
a beacon (`VestingBeaconModule`), and added `FixedReturn` as a new beacon.

## Layout

```
contract/versions/registry.json               # version registry (source of truth, distributed as version-registry.json)
contract/versions/<version>/abi/*.json         # ABIs recompiled at the deploy commit
contract/versions/<version>/deployed_addresses/chain-137.json   # from git at the deploy commit
```

app, dashboard, and ponder receive the same per-version JSON ABIs +
`deployed_addresses/<version>/chain-137.json`; backend gets its 6 hand-named raw-ABI
files. Only the JSON ABIs are packaged (ponder's typed `.ts` wrappers are a deferred
runtime concern; these folders are for tracking/audit). Distribute with
`node contract/scripts/distribute-versions.mjs` after `contract/versions/` changes.

## Regenerating

```bash
contract/scripts/regenerate-version.sh V0 a8c6f815b
contract/scripts/regenerate-version.sh V0.1 d79baeaaf
contract/scripts/regenerate-version.sh V1 9613f0882
contract/scripts/regenerate-version.sh V2 026a2377b
node contract/scripts/build-version-registry.mjs   # rebuild registry from the folders
node contract/scripts/distribute-versions.mjs      # fan the folders out to every consumer
```

ABIs are extracted from the compiled hardhat artifacts (restricted to the current
contract set), so older versions correctly have fewer contracts (e.g. `FixedReturn`
absent from V0/V0.1).

## Caveats

- **The git deploy history is unreliable** — `deployed_addresses` was hand-edited
  across many commits and branches, and the app vs Ignition copies diverged. The
  **authoritative anchor is the prod factory beacon** (`Officer#FactoryBeacon`),
  not the commit/date. Dates above are approximate (commit date).
- **V0.1's addresses come from the Ignition `deployed_addresses.json`** at
  `d79baeaaf` (factory `0x0205`), because the app copy at that commit still showed
  `0x2d92` (V0) — the two files disagreed.
- **V2's `contract/versions/V2/` folder was reconstructed from the app copy**
  (`app/src/artifacts/{abi,deployed_addresses}/V2/`), not via
  `regenerate-version.sh` — the app copy was added ad hoc (`Add V2 ABIs …`)
  before `026a2377b` finalized the Polygon addresses, and `registry.json` was
  never updated to register it. The `dashboard`/`ponder` copies of
  `deployed_addresses/V2/chain-137.json` had also silently drifted to hold V1
  addresses (a stale re-freeze); `distribute-versions.mjs` re-synced them from
  the canonical `V2/` folder. If you need a from-scratch, recompiled-at-commit
  V2 snapshot later, use `regenerate-version.sh V2 026a2377b` and re-run the two
  scripts above.
- `registry.json` `beacons`/`implementations` are derived from each version's own
  addresses, so a contract absent from a generation is correctly missing, and
  `Vesting` appears only under `implementations` (transparent proxy) for
  V0/V0.1/V1 — V2 beaconized it, so it appears under `beacons` too (see
  `implOverride` in `build-version-registry.mjs`).
- `officerVersions` is empty (runtime per-team resolution not wired yet); the
  concrete per-version identifier is `officer` / `beacons.Officer`.
