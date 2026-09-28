# Polygon 2.0.1 Upgrade Runbook

This release upgrades four existing beacon implementations without replacing their beacons or proxies:

1. `CashRemunerationEIP712`
2. `ExpenseAccountEIP712`
3. `Investor`
4. `Officer`

No command in this runbook deploys a new user-facing proxy. Existing proxy storage remains attached to the existing beacons.

## Reproducibility rule

The release owns four immutable Ignition recipes under `ignition/modules/upgrades/v2.0.1/`:

- `CashRemunerationUpgradeModule.ts`
- `ExpenseAccountUpgradeModule.ts`
- `InvestorUpgradeModule.ts`
- `OfficerUpgradeModule.ts`

The guarded release script runs these exact files on Polygon. Do not edit this version directory or reuse it for a later release. The
internal Ignition IDs retain `V201` so their journal identities remain unique. `CNC_UPGRADE_CHAIN_ID` selects the canonical Polygon
deployment registry, and the candidates are compared to the committed Polygon 2.0.0 baselines. Fresh local environments already deploy the
2.0.1 implementations through `deploy.sh`, so they do not replay this production-only upgrade.

## Safety checks

Before any transaction, the guarded script:

- validates all four implementations and storage layouts in one simulated Hardhat process against the Polygon 2.0.0 baselines;
- requires the connected chain to match the selected deployment registry;
- confirms that the configured signer owns every target beacon;
- confirms each current implementation reports an expected version;
- confirms the Officer implementation uses the canonical FeeCollector proxy;
- writes the previous implementation addresses to the ignored `contract/.upgrade-state/` directory.

The script exits on the first failure. Investor is upgraded before Officer because Officer 2.0.1 expects the Investor 2.0.1 ownership and
role behaviour.

The four committed baselines describe the exact storage-bearing `2.0.0` sources already behind the Polygon beacons. They restore missing or
stale production references; they are not baselines baked from the unreleased `2.0.1` deployments. Each `2.0.1` change is storage-neutral,
so the compiled candidate must compare equal to those `2.0.0` layouts before any transaction is broadcast.

## Polygon preparation

Load the authorised beacon-owner signer through the project's Hardhat keystore and configure the Polygon network environment. Then run the
read-only preparation gate:

```bash
CNC_CONFIRM_POLYGON_V201_UPGRADE=upgrade-polygon-v2.0.1 npm run prepare-upgrade:v201:polygon
```

This command validates layouts, ownership, versions, constructor wiring, and rollback inputs. It does not broadcast an upgrade transaction.
Static implementation and storage checks do not load Polygon configuration. The production keystore is unlocked once, only when the
read-only Polygon preflight checks beacon ownership and implementations and records the rollback manifest.

## Polygon deployment

Only after the preparation output and rollback manifest have been reviewed, run:

```bash
CNC_CONFIRM_POLYGON_V201_UPGRADE=upgrade-polygon-v2.0.1 npm run deploy-upgrade:v201:polygon
```

The script keeps the preflight, all four Ignition deployments, their per-target readbacks, and the final verification in one Hardhat
process. The production keystore is therefore unlocked once for the complete live operation. It still upgrades and verifies one target at a
time in the documented order. If a step fails, stop and inspect the saved manifest and on-chain state before continuing. Do not restart
blindly: completed Ignition futures and already-upgraded beacons must be reconciled first.

## Post-deployment evidence

Record the transaction hashes outside the repository until they are ready for the public release record. Confirm:

- each target beacon points to the intended implementation;
- each implementation and representative proxy reports `2.0.1`;
- representative Cash Remuneration and Expense Account proxy state is unchanged;
- representative Investor metadata, ownership, balances, and roles are unchanged;
- representative Officer ownership, beacon configuration, and FeeCollector reference are unchanged;
- the four Polygon storage baselines are rebaked from the deployed implementations for the next release.

Never commit private keys, RPC credentials, or the local rollback manifest.
