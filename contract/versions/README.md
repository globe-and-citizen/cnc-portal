# Contract-artifact versions

Deployment-aligned snapshots of the CNC contract ABIs and deployed addresses on
Polygon (chain 137). Each `<version>/` folder is a faithful record of one real
deployment: the **ABIs are recompiled at the deploy commit** (authoritative — the
committed ABIs in the repo can lag the `.sol` source) and the **deployed addresses
are copied verbatim from git history** at that commit.

This replaces the earlier `v1` placeholder, which was frozen from `HEAD` and did
not correspond to any real deployment.

Version names stay short (`V0`, `V0.1`, `V1`) and only carry more precision when a
deployment needs to be distinguished from a sibling — e.g. `V0.1` is the minor
in-place upgrade between the `V0` and `V1` full deployments.

## Versions

| version | deploy commit | on-chain date | Officer                                      | notes                                                                                                               |
| ------- | ------------- | ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `V0`    | `44cd9eb12`   | 2026-04-02    | `0x8aC4A4793EfCdA54e7BaECa6D0479292f4996162` | full redeploy                                                                                                       |
| `V0.1`  | `41c1ea08c`   | 2026-04-04    | _(same `0x8aC4…`)_                           | in-place beacon upgrade of ExpenseAccount + CashRemuneration (same addresses; adds `*UpgradeModule#*` impl records) |
| `V1`    | `9613f0882`   | 2026-04-24    | `0xa90C50305C45d613D951D1Dd435294BFcA5f4615` | full redeploy (fresh addresses; ~20 days of source evolution)                                                       |

`current` in `registry.json` = `V1`.

## Layout

```
contract/versions/registry.json               # version registry (source of truth, distributed as version-registry.json)
contract/versions/<version>/abi/*.json         # ABIs recompiled at the deploy commit
contract/versions/<version>/deployed_addresses/chain-137.json   # copied from git at the deploy commit
```

The app receives the same per-version artifacts under
`app/src/artifacts/{abi/<version>/json, deployed_addresses/<version>}/`.

Only the JSON ABIs are packaged (the actual snapshot). Typed `.ts` wrappers are a
runtime concern and are generated per contract set when version-aware resolution
is wired (not done here — these folders are for tracking/audit).

## Regenerating

```bash
# one version at a time (clones + recompiles at the commit, writes the folders)
contract/scripts/regenerate-version.sh V0 44cd9eb12
contract/scripts/regenerate-version.sh V0.1 41c1ea08c
contract/scripts/regenerate-version.sh V1 9613f0882
# then rebuild the registry from the freshly written deployed_addresses:
node contract/scripts/build-version-registry.mjs
```

## Notes

- `registry.json` `beacons`/`implementations` are **derived from each version's own
  `deployed_addresses`** — so contracts not deployed in a version (e.g. `FixedReturn`,
  or `Voting` in `V1`) are correctly absent, and `Vesting` appears only under
  `implementations` (it is a transparent proxy, not a beacon).
- `officerVersions` (backend `TeamOfficer.version` tags) is intentionally empty:
  per-team runtime resolution is not wired yet, and `V0`/`V0.1` share the same
  Officer, so they are not distinguishable per-team (the difference is temporal —
  before/after the 2026-04-04 upgrade).
- On-chain dates are the real `block.timestamp` of the deploy transactions; they can
  predate the commit that recorded the deployment in git.
