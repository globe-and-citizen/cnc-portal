# Ignition Modules

This directory contains Hardhat Ignition modules for deploying the Officer and its sub-contracts (beacons).

See the [`modules` upgrade guide](./modules/README.md) before creating or running an upgrade module.

## Current Modules

The **OfficerModule** deploys the following beacons:

| Module                        | Contract               | Purpose                                       |
| ----------------------------- | ---------------------- | --------------------------------------------- |
| BankBeaconModule              | Bank                   | Team balance tracking & dividend distribution |
| BoardOfDirectorsBeaconModule  | BoardOfDirectors       | Board-of-directors voting & access control    |
| ElectionsModule               | Elections              | Officer-wide elections & voting               |
| ProposalModule                | Proposals              | Team proposals & governance                   |
| InvestorBeaconModule          | Investor (V2)          | Share token for team shareholders             |
| ExpenseAccountEIP712Module    | ExpenseAccountEIP712   | Team expense tracking                         |
| CashRemunerationEIP712Module  | CashRemunerationEIP712 | Team payroll with EIP-712 sig verification    |
| SafeDepositRouterBeaconModule | SafeDepositRouter      | Deposit → shares minting router               |
| VestingBeaconModule           | Vesting                | Token vesting schedules per team              |
| FeeCollectorModule            | FeeCollector           | Fee aggregation for protocol                  |

## Adding a New Contract

To add a new beacon to Officer deployments:

1. **Create the module** (e.g., `NewContractBeaconModule.ts`):

   ```typescript
   import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

   export default buildModule("NewContractBeacon", (m) => {
     const beaconAdmin = m.getAccount(0);
     const impl = m.contract("NewContract");
     const beacon = m.contract("UpgradeableBeacon", [impl, beaconAdmin]);
     return { beacon, impl };
   });
   ```

2. **Import in OfficerModule.ts**:

   ```typescript
   import newContractBeaconModule from "./NewContractBeaconModule";
   ```

3. **Add to Officer deployment graph**:

   ```typescript
   m.useModule(newContractBeaconModule);
   ```

4. **Register the beacon type in Officer.configureBeacon()** during deployment via script or manual call.

## Test-Only Modules

- **MockTokensModule** — Test fixture for local/test deployments (USDC, USDCe, USDT mocks)
  - Never deployed to production
  - Used in hardhat test environment

## Version 2.0.1 Upgrade Modules

The current Polygon 2.0.1 release uses one independently verifiable module per existing beacon:

| Module                                                                                        | Existing beacon registry key                 | New implementation     |
| --------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------- |
| [`CashRemunerationUpgradeModule`](./modules/upgrades/v2.0.1/CashRemunerationUpgradeModule.ts) | `CashRemunerationEIP712Module#FactoryBeacon` | CashRemunerationEIP712 |
| [`ExpenseAccountUpgradeModule`](./modules/upgrades/v2.0.1/ExpenseAccountUpgradeModule.ts)     | `ExpenseAccountEIP712Module#FactoryBeacon`   | ExpenseAccountEIP712   |
| [`InvestorUpgradeModule`](./modules/upgrades/v2.0.1/InvestorUpgradeModule.ts)                 | `InvestorBeaconModule#Beacon`                | Investor               |
| [`OfficerUpgradeModule`](./modules/upgrades/v2.0.1/OfficerUpgradeModule.ts)                   | `Officer#FactoryBeacon`                      | Officer                |

The Officer module also resolves `FeeCollectorModule#FeeCollector` and supplies it to the new implementation constructor. These release
modules require `CNC_UPGRADE_CHAIN_ID=137` and refuse any other deployment registry.

Release modules are immutable deployment recipes: do not edit a released `upgrades/vX.Y.Z/` directory. Create a new version directory so
each production upgrade has an auditable recipe. Keep the release version in the internal Ignition module and future IDs even though the
directory already versions the filename. The unversioned example and one-off upgrade modules have been removed; their executed history
remains in frozen deployment snapshots and Git.

Use [`../deploy-upgrade-v2.0.1.sh`](../deploy-upgrade-v2.0.1.sh) through the npm commands documented in the
[Polygon 2.0.1 runbook](../releases/polygon-v2.0.1.md). The script intentionally targets Polygon only because fresh local deployments
already use the current implementations. Its live orchestrator reuses one Hardhat connection for the four sequential module deployments and
their readbacks so the production keystore is unlocked once. Do not invoke Officer before Investor.

## Adding New Contracts

Modules for **planned** or **speculative** contracts should **not** be committed. Instead:

- Document them in this file under "Planned Modules" section
- Reference the GitHub issue tracking implementation
- Implement the module only when the contract is ready for production

This keeps deployments lean and explicit about what ships.

**Deleted modules:**

- VotingBeaconModule (Voting contract exists but not integrated with Officer)
