# Polygon 2.0.1 Upgrade Runbook

This release upgrades four existing beacon implementations without replacing their beacons or proxies:

1. `CashRemunerationEIP712`
2. `ExpenseAccountEIP712`
3. `Investor`
4. `Officer`

No command in this runbook deploys a new user-facing proxy. Existing proxy storage remains attached to the existing beacons.

## Reproducibility rule

The release owns four immutable Ignition recipes:

- `CashRemunerationV201UpgradeModule.ts`
- `ExpenseAccountV201UpgradeModule.ts`
- `InvestorV201UpgradeModule.ts`
- `OfficerV201UpgradeModule.ts`

Run these exact files in the local rehearsal and on Polygon. Do not edit an older generic module or reuse a `V201` module for a later
release. Ignition records each network in a separate chain journal, while `CNC_UPGRADE_CHAIN_ID` selects that chain's canonical deployment
registry. Both paths compare the candidate layouts to the same Polygon 2.0.0 baselines. This keeps the implementation recipe and safety gate
identical while the addresses remain network-specific.

## Safety checks

Before any transaction, the guarded script:

- validates the four storage layouts against the Polygon 2.0.0 baselines;
- requires the connected chain to match the selected deployment registry;
- confirms that the configured signer owns every target beacon;
- confirms each current implementation reports an expected version;
- confirms the Officer implementation uses the canonical FeeCollector proxy;
- writes the previous implementation addresses to the ignored `contract/.upgrade-state/` directory.

The script exits on the first failure. Investor is upgraded before Officer because Officer 2.0.1 expects the Investor 2.0.1 ownership and
role behaviour.

## Local rehearsal

Start from a known local deployment whose canonical addresses are recorded under `ignition/deployments/chain-31337/`, then run:

```bash
npm run rehearse-upgrade:v201:local
```

After the run, verify that all four beacon implementations changed, every proxy still exposes its prior state, and every proxy reports
`2.0.1`.

## Polygon preparation

Load the authorised beacon-owner signer through the project's Hardhat keystore and configure the Polygon network environment. Then run the
read-only preparation gate:

```bash
CNC_CONFIRM_POLYGON_V201_UPGRADE=upgrade-polygon-v2.0.1 npm run prepare-upgrade:v201:polygon
```

This command validates layouts, ownership, versions, constructor wiring, and rollback inputs. It does not broadcast an upgrade transaction.

## Polygon deployment

Only after the preparation output and rollback manifest have been reviewed, run:

```bash
CNC_CONFIRM_POLYGON_V201_UPGRADE=upgrade-polygon-v2.0.1 npm run deploy-upgrade:v201:polygon
```

The script upgrades and reads back one target at a time. If a step fails, stop and inspect the saved manifest and on-chain state before
continuing. Do not restart blindly: completed Ignition futures and already-upgraded beacons must be reconciled first.

## Post-deployment evidence

Record the transaction hashes outside the repository until they are ready for the public release record. Confirm:

- each target beacon points to the intended implementation;
- each implementation and representative proxy reports `2.0.1`;
- representative Cash Remuneration and Expense Account proxy state is unchanged;
- representative Investor metadata, ownership, balances, and roles are unchanged;
- representative Officer ownership, beacon configuration, and FeeCollector reference are unchanged;
- the four Polygon storage baselines are rebaked from the deployed implementations for the next release.

Never commit private keys, RPC credentials, or the local rollback manifest.
