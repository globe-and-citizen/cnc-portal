# CNC Portal — Ponder Indexer

Indexes on-chain events from the CNC Portal smart contracts on Polygon (chain 137).

## What is indexed

| Contract               | Events                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| OfficerFactoryBeacon   | `BeaconProxyCreated`                                                                                                                  |
| Officer                | `ContractDeployed`                                                                                                                    |
| Bank                   | `Deposited`, `TokenDeposited`, `Transfer`, `TokenTransfer`, `FeePaid`, `DividendDistributionTriggered`                                |
| Elections              | `ElectionCreated`, `VoteSubmitted`, `ResultsPublished`                                                                                |
| Proposals              | `ProposalCreated`, `ProposalVoted`, `ProposalTallyResults`                                                                            |
| BoardOfDirectors       | `ActionAdded`, `ActionExecuted`, `Approval`, `Revocation`, `BoardOfDirectorsChanged`, `OwnersChanged`                                 |
| InvestorV1             | `Minted`, `DividendDistributed`, `DividendPaid`, `DividendPaymentFailed`                                                              |
| CashRemunerationEIP712 | `Deposited`, `Withdraw`, `WithdrawToken`, `WageClaimEnabled`, `WageClaimDisabled`                                                     |
| SafeDepositRouter      | `Deposited`, `DepositsEnabled`, `DepositsDisabled`, `SafeAddressUpdated`, `MultiplierUpdated`, `TokenSupportAdded`, `TokensRecovered` |
| ExpenseAccountEIP712   | `Deposited`, `TokenDeposited`, `Transfer`, `TokenTransfer`, `ApprovalActivated`, `ApprovalDeactivated`                                |

## Setup

Copy `.env.local.example` to `.env.local` and fill in the RPC URL:

```
PONDER_RPC_URL_137=https://polygon-mainnet.g.alchemy.com/v2/<your-key>
```

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm dev            # start indexer in development mode
pnpm generate-abis  # regenerate ABI TypeScript files from abis/json/
```

---

## Known Limitation & Improvement

### Sub-contract factory does not filter by contract type

**Current behavior**

All sub-contract types (Bank, Elections, Proposals, etc.) are registered using the
same global factory watching `ContractDeployed(string contractType, address deployedAddress)`:

```ts
// ponder.config.ts
Bank: {
  address: factory({
    event: parseAbiItem("event ContractDeployed(string contractType, address deployedAddress)"),
    parameter: "deployedAddress",
  }),
}
```

Ponder extracts only the `deployedAddress` and ignores `contractType`. As a result, **every
deployed sub-contract address gets registered under all 8 contract types simultaneously**.

It does not cause incorrect data — a Bank contract does not emit Elections events so those
handlers never fire — but ponder makes unnecessary RPC log-filter calls for each
mismatched (address, contract type) pair, which wastes resources during historical backfill
and live indexing.

**Recommended fix — Separate events per contract type in the Officer contract**

Change the `Officer` smart contract to emit a typed event for each contract type instead of
a single generic `ContractDeployed`:

```solidity
// Instead of:
event ContractDeployed(string contractType, address deployedAddress);

// Emit specific events:
event BankDeployed(address deployedAddress);
event ElectionsDeployed(address deployedAddress);
event ProposalsDeployed(address deployedAddress);
event BoardOfDirectorsDeployed(address deployedAddress);
event InvestorV1Deployed(address deployedAddress);
event CashRemunerationDeployed(address deployedAddress);
event SafeDepositRouterDeployed(address deployedAddress);
event ExpenseAccountDeployed(address deployedAddress);
```

Each ponder contract definition then watches only its own event:

```ts
// ponder.config.ts
Bank: {
  address: factory({
    event: parseAbiItem("event BankDeployed(address deployedAddress)"),
    parameter: "deployedAddress",
  }),
},
Elections: {
  address: factory({
    event: parseAbiItem("event ElectionsDeployed(address deployedAddress)"),
    parameter: "deployedAddress",
  }),
},
// ...
```

**Why this is better**

- Ponder only registers an address under the contract type it actually is.
- No wasted RPC calls during backfill or live sync.
- Clearer on-chain semantics — the event name itself documents what was deployed.

**Scope of change**

- `contracts/Officer.sol` — add typed events and emit them in `deployBeaconProxy`
- `ponder/ponder.config.ts` — update each factory to use its typed event
- `ponder/abis/officer.ts` — add the new events to the ABI
- Re-run `npx hardhat compile` to regenerate JSON ABIs
