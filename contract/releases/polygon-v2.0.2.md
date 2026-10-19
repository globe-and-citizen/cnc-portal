# Polygon Expense Account 2.0.2 Upgrade Runbook

This release upgrades the existing Expense Account FactoryBeacon of the current V2 generation to implementation `2.0.2`. It fixes inactive
approval enforcement. The remaining Accounts criteria, including paused spending, one-time unsupported tokens, funding, and return-to-Bank
proof, retain their canonical status in the [Accounts feature](../../docs/features/accounts/README.md).

The [upgrade-module guide](../ignition/modules/README.md) owns the general procedure. This release uses only
[`ExpenseAccountUpgradeModule.ts`](../ignition/modules/upgrades/v2.0.2/ExpenseAccountUpgradeModule.ts), with unique `V202` Ignition IDs.
Existing beacons, proxies, and approval signature domains are preserved. No initializer or reinitializer is called.

## Preparation

Use a clean, reviewed checkout, configure the target network and authorised beacon-owner keystore, then run:

```bash
CNC_CONFIRM_POLYGON_V202_UPGRADE=upgrade-polygon-v2.0.2 npm run prepare-upgrade:v202:polygon
```

The command validates the compiled candidate version and production storage baseline on a simulated network without production secrets. Only
after those checks pass does it open the target connection, verify the chain and canonical registry, check beacon ownership and the current
implementation version (`2.0.0`, `2.0.1`, or an already upgraded `2.0.2`), and record rollback inputs in ignored `.upgrade-state/`. An
existing manifest is never overwritten. Preparation broadcasts no live transaction.

Before deployment, record representative proxy owner, supported tokens, native and ERC-20 balances, and approval usage/state. Retain the
original rollback manifest. Rehearsal covers a released `2.0.0` proxy with an existing signed weekly approval: usage, owner, support set,
and token balance survive the recipe; the inactive approval then rejects spending and can be reactivated within its original allowance.

## Deployment

After reviewing preparation output and the rollback inputs, run:

```bash
CNC_CONFIRM_POLYGON_V202_UPGRADE=upgrade-polygon-v2.0.2 npm run deploy-upgrade:v202:polygon
```

The script repeats preparation, deploys the new implementation, upgrades only the existing Expense Account beacon, and verifies both its
exact implementation address against the Ignition result and its reported `2.0.2` version. Run the guarded npm command for this operation;
invoking the Ignition module alone does not perform release preflight checks. The module's beacon parameter exists for disposable rehearsal;
the guarded production script uses the canonical registry default.

If interrupted, compare the saved manifest, Ignition journal, and current beacon state before resuming. Preserve the original rollback
inputs. Re-running the same Ignition futures reconciles their recorded execution; it is not a reason to reset the journal.

## Post-deployment verification

Compare each recorded proxy value with its pre-upgrade value. Confirm proxy `version()` reports `2.0.2`, an inactive signed approval rejects
spending without moving funds, and its original signature remains usable after owner reactivation. Review the successful transfer events.
Then bake the Expense Account production storage baseline from the deployed implementation and record release evidence through the normal
release workflow. Do not change a baseline before deployment.

The earlier four-contract `2.0.1` recipe requires candidates reporting `2.0.1` and fails static validation when compiled from a checkout
containing Expense Account `2.0.2`. Its [runbook](./polygon-v2.0.1.md) owns that earlier release; it must not silently deploy this patch
under `V201` journal identities.
