# Contract upgrade strategy

This document defines how we evolve our upgradeable contracts. It exists to answer one
recurring question: **for this change, do I upgrade in place or redeploy?**

The default answer is **upgrade in place**. Redeployment is expensive: it breaks on-chain
references, forces state migration, loses historical context, and often cascades into
redeploying dependent contracts (e.g. Officer). We only redeploy when the OpenZeppelin
upgrades plugin tells us we have to.

## 1. The decision rule

```txt
┌─────────────────────────────────────────────────────────────────┐
│  1. Modify the contract in place (do NOT create InvestorV2.sol  │
│     for a compatible change)                                    │
│  2. Bump version() per semver                                   │
│  3. Run: npm run validate-upgrade                               │
│  4a. PASS → deploy via the existing XxxUpgradeModule            │
│  4b. FAIL → read errors, try to keep storage compatible:        │
│       - append new vars at the end, not in the middle           │
│       - use the __gap to absorb new vars                        │
│       - do NOT reorder inheritance                              │
│  4c. Still fails → this is a breaking change. Follow the        │
│       "Redeployment + migration" playbook in section 5          │
└─────────────────────────────────────────────────────────────────┘
```

The rule in one sentence: **never redeploy by default; let `validate-upgrade` be
the one that forces the decision.**

## 2. What is storage-compatible

**Compatible** (upgrade in place, zero migration):

- Adding a new state variable **at the end** of the storage layout
- Consuming slots from an existing `__gap` array (shrink the gap, add the var)
- Adding, removing, or modifying **functions**, modifiers, events, errors
- Changing the **logic** of an existing function (including bug fixes)
- Adding a new `constant` or `immutable` (they don't occupy storage)

**Incompatible** (plugin will reject, typically requires redeployment):

- Reordering, renaming the type of, or removing an existing storage variable
- Changing the order of parent contracts in the inheritance list
- Adding a new parent contract with its own storage **before** existing parents
- Converting a storage variable to `constant`/`immutable` or vice versa
- Changing a type in a way that changes its size (e.g. `uint128` → `uint256`)

**Gray area** (possible with care, use `reinitializer(N)`):

- Adding a parent contract at the end of the inheritance list (storage goes after
  existing vars — usually compatible if there's a `__gap`, but verify)
- Changing logic that depends on a previously-uninitialized state variable (must
  initialize it via a `reinitializer` in the new implementation)

## 3. Version tracking

Every upgradeable contract exposes its own version on-chain:

```solidity
/// @notice Semver of the implementation currently behind the proxy.
/// @dev Bump on every deployment to a production network.
function version() external pure returns (string memory) {
  return '1.3.0';
}
```

Semver rules for contracts:

- **Patch** (`1.2.0 → 1.2.1`) — bugfix only, no API change, no storage change
- **Minor** (`1.2.0 → 1.3.0`) — added API, added storage (compatible append)
- **Major** (`1.x.x → 2.0.0`) — breaking change, typically means redeployment

**Anti-pattern**: naming files `InvestorV1.sol`, `InvestorV2.sol` on every upgrade. The
`V1` suffix should only appear when there is a _separate proxy_ for the old version —
i.e. when we actually did a redeployment. For a compatible upgrade, you edit
`Investor.sol` in place and bump `version()`. The file name represents a _proxy line_,
not a code revision.

For historical reasons we still have `InvestorV1.sol`. Treat it as the canonical name of
that proxy line; do not create `InvestorV2.sol` unless you actually redeploy a fresh
proxy.

## 4. Running `validate-upgrade`

Baselines are **per network**. They live in `storage-baselines/<network>/<Contract>.json`
and are committed to git. Today we care about:

- `polygon` — production
- `localhost` — local dev / hardhat node

The script **refuses to run without `--network <name>`**. The default in-memory
`hardhat` network is not a valid baseline target — it would produce a baseline that
doesn't represent any real chain. Use the `:polygon` / `:local` npm aliases.

### First-time setup

Bake a storage baseline for every upgradeable contract, from the code that is
_currently deployed to that network_:

```bash
# Production baselines (after a clean polygon deploy from the current develop branch)
BAKE=1 npm run validate-upgrade:polygon

# Local baselines (after running deploy.sh against a local hardhat node)
BAKE=1 npm run validate-upgrade:local
```

This writes `storage-baselines/<network>/<Contract>.json` for each contract.
**Commit these files** — they are the source of truth for what the on-chain storage
layout looks like for that network.

### On every change

Before you push a PR that modifies a contract in `contracts/`:

```bash
# Check against production — this is the one that matters
npm run validate-upgrade:polygon

# Also check localhost if you maintain a local baseline
npm run validate-upgrade:local
```

The script compiles, then for each upgradeable contract:

1. Runs OpenZeppelin's `validateImplementation` (catches constructors with state,
   `selfdestruct`, unsafe `delegatecall`, missing initializers, etc.)
2. Compares the current storage layout against
   `storage-baselines/<network>/<Contract>.json`

Output legend:

- `OK` — safe to upgrade in place on that network
- `OK (N warnings)` — safe, but review the warnings (renames, appended vars)
- `SKIP` — no baseline for that network; bake one
- `FAIL` — do **not** upgrade this proxy. See section 5.

### After a successful deployment

When you deploy a new implementation to prod (polygon), re-bake the baseline for
that contract on that network so future diffs are relative to the new on-chain state:

```bash
BAKE=1 CONTRACT=InvestorV1 npm run validate-upgrade:polygon
git add storage-baselines/polygon/InvestorV1.json
git commit -m "chore(contracts): bake polygon/InvestorV1 baseline after 1.3.0 deploy"
```

Do the same on `localhost` after a local deploy.sh run, if you maintain local
baselines.

### Validating a single contract

```bash
CONTRACT=Officer npm run validate-upgrade:polygon
```

### When polygon and localhost drift

It is normal for `localhost` to temporarily be ahead of `polygon` while you are
iterating on a change. The rule of thumb:

- The **polygon baseline** represents production. It must stay green on every PR
  that ships — that's the gate.
- The **localhost baseline** is a scratch pad. You bake it when your local node is
  in a known good state, and you re-bake it when you're happy with a change. It
  exists to help you notice unintended layout drift during iteration.

If you deliberately make a breaking change on localhost that doesn't yet apply to
polygon, either re-bake the local baseline to accept the change, or delete
`storage-baselines/localhost/<Contract>.json` until you're ready to ship.

## 5. Redeployment + migration playbook

Only follow this when `validate-upgrade` rejects the change and you cannot restructure
the code to keep the layout compatible.

1. **Bump the major version** (`2.0.0`) and add an entry in `CHANGELOG.md` explaining
   _why_ the change is incompatible.
2. **Rename the old file** to `<Name>V1.sol` (if it isn't already) and create
   `<Name>V2.sol` for the new version. Keep the old file — you'll need it for state
   extraction.
3. **Write the new beacon and upgrade modules** under `ignition/modules/`:
   - `<Name>V2BeaconModule.ts` — deploys the new beacon + implementation
   - `<Name>V2UpgradeModule.ts` — template for future compatible upgrades of V2
4. **Write a migration script** under `scripts/migrate-<name>-v1-to-v2.ts` that:
   - Pauses V1 (if supported) to stop state changes
   - Reads all state from V1 (iterating via view getters)
   - Calls V2's initializer / batch-seed function to replicate that state
   - Verifies invariants (total supply, counts, sample balances)
5. **Update Officer** to point to the V2 beacon. Prefer calling a registry function on
   the existing Officer proxy — **do not redeploy Officer** unless Officer itself has an
   incompatible storage change.
6. **Bake a fresh baseline** for V2 (not V1 — V1 is frozen from now on).
7. **Update the `version()` function** on V2 to start at `2.0.0`.

## 6. Officer-specific rule

Officer is a registry. It should **almost never** be redeployed, because every other
contract holds its address, and the dashboard hard-codes it per network. Before touching
Officer:

- If you're adding a new contract type to the registry, that is a _function call_,
  not a code change. No upgrade needed.
- If you're changing Officer's logic or storage, run `validate-upgrade` and fight hard to
  keep it compatible. Use `__gap` slots. Do not rearrange parents.
- Only redeploy Officer if the plugin refuses and there's no storage-compatible
  refactor — and in that case, every contract that references Officer's address needs
  to be updated too (subgraph, frontend, other contracts).

## 7. Checklist (copy into your PR description)

```txt
Upgrade checklist:
- [ ] Modified contract in place (no new VN+1 file unless redeploying)
- [ ] Bumped `version()` following semver
- [ ] Added a line to CHANGELOG.md
- [ ] `npm run validate-upgrade:polygon` passes locally
- [ ] If FAIL: documented why redeployment is needed + wrote migration script
- [ ] After merge + polygon deploy: re-baked `storage-baselines/polygon/<X>.json`
      and committed
```
