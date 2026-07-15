# Contract-artifact versions

Deployment-aligned snapshots of the CNC contract ABIs and deployed addresses on
Polygon (chain 137), **matched to the three real prod `Officer#FactoryBeacon`
generations** (the ones detected on-chain across live teams). For each, the
**ABIs are recompiled at the deploy commit** (authoritative — committed ABIs and
the raw git deploy log are unreliable) and the **deployed addresses are taken
from git** at that commit.

This replaces the earlier `v1` placeholder (frozen from `HEAD`) and an initial
mis-pick that pointed V0/V0.1 at a `0x8aC4…` generation which has no live teams.

Version names stay short (`V0`, `V0.1`, `V1`); they are **three distinct full
redeployments** (each a new Officer + factory beacon).

## Versions

| version | Officer#FactoryBeacon | Officer#Officer | deploy commit | ~date   |
| ------- | --------------------- | --------------- | ------------- | ------- |
| `V0`    | `0x2d92…F374`         | `0xb5D4BC…D33f` | `a8c6f815b`   | 2026-02 |
| `V0.1`  | `0x0205…a6A0`         | `0xCCa727…Ff08` | `d79baeaaf`   | 2026-04 |
| `V1`    | `0x91EB…F1dE`         | `0xa90C…4615`   | `9613f0882`   | 2026-04 |

`current` in `registry.json` = `V1` (the factory beacon live on `develop`).
`0x0205…` (V0.1) is the one Ponder pins as the prod factory.

## Layout

```
contract/versions/registry.json               # version registry (source of truth, distributed as version-registry.json)
contract/versions/<version>/abi/*.json         # ABIs recompiled at the deploy commit
contract/versions/<version>/deployed_addresses/chain-137.json   # from git at the deploy commit
```

The app receives the same per-version artifacts under
`app/src/artifacts/{abi/<version>/json, deployed_addresses/<version>}/`. Only the
JSON ABIs are packaged (typed `.ts` wrappers are a deferred runtime concern; these
folders are for tracking/audit).

## Regenerating

```bash
contract/scripts/regenerate-version.sh V0 a8c6f815b
contract/scripts/regenerate-version.sh V0.1 d79baeaaf
contract/scripts/regenerate-version.sh V1 9613f0882
node contract/scripts/build-version-registry.mjs   # rebuild registry from the folders
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
- `registry.json` `beacons`/`implementations` are derived from each version's own
  addresses, so a contract absent from a generation is correctly missing, and
  `Vesting` appears only under `implementations` (transparent proxy, not a beacon).
- `officerVersions` is empty (runtime per-team resolution not wired yet); the
  concrete per-version identifier is `officer` / `beacons.Officer`.
