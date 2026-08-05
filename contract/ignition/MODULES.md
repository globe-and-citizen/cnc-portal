# Ignition Modules

This directory contains Hardhat Ignition modules for deploying the Officer and its sub-contracts (beacons).

## Current Modules

The **OfficerModule** deploys the following beacons:

| Module | Contract | Purpose |
|--------|----------|---------|
| BankBeaconModule | Bank | Team balance tracking & dividend distribution |
| BoardOfDirectorsBeaconModule | BoardOfDirectors | Board-of-directors voting & access control |
| ElectionsModule | Elections | Officer-wide elections & voting |
| ProposalModule | Proposals | Team proposals & governance |
| InvestorBeaconModule | Investor (V2) | Share token for team shareholders |
| ExpenseAccountEIP712Module | ExpenseAccountEIP712 | Team expense tracking |
| CashRemunerationEIP712Module | CashRemunerationEIP712 | Team payroll with EIP-712 sig verification |
| SafeDepositRouterBeaconModule | SafeDepositRouter | Deposit → shares minting router |
| VestingBeaconModule | Vesting | Token vesting schedules per team |
| FeeCollectorModule | FeeCollector | Fee aggregation for protocol |

## Adding a New Contract

To add a new beacon to Officer deployments:

1. **Create the module** (e.g., `NewContractBeaconModule.ts`):
   ```typescript
   import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
   
   export default buildModule('NewContractBeacon', (m) => {
     const beaconAdmin = m.getAccount(0)
     const impl = m.contract('NewContract')
     const beacon = m.contract('UpgradeableBeacon', [impl, beaconAdmin])
     return { beacon, impl }
   })
   ```

2. **Import in OfficerModule.ts**:
   ```typescript
   import newContractBeaconModule from './NewContractBeaconModule'
   ```

3. **Add to Officer deployment graph**:
   ```typescript
   m.useModule(newContractBeaconModule)
   ```

4. **Register the beacon type in Officer.configureBeacon()** during deployment via script or manual call.

## Test-Only Modules

- **MockTokensModule** — Test fixture for local/test deployments (USDC, USDCe, USDT mocks)
  - Never deployed to production
  - Used in hardhat test environment

## Adding New Contracts

Modules for **planned** or **speculative** contracts should **not** be committed. Instead:
- Document them in this file under "Planned Modules" section
- Reference the GitHub issue tracking implementation
- Implement the module only when the contract is ready for production

This keeps deployments lean and explicit about what ships.

**Deleted modules:**
- VotingBeaconModule (Voting contract exists but not integrated with Officer)
