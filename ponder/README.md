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

```bash
cp .env.local.example .env.local
pnpm install
pnpm dev
```

### Polygon (default)

Fill in your Alchemy RPC key:

```
PONDER_RPC_URL_137=https://polygon-mainnet.g.alchemy.com/v2/<your-key>
```

### Local Hardhat node

1. Start the Hardhat node and deploy the contracts (from the repo root):

   ```bash
   npx hardhat node
   # in another terminal:
   npx hardhat run scripts/deploy.ts --network localhost
   ```

2. Note the `OfficerFactoryBeacon` address printed by the deploy script.

3. In `.env.local`, set:

   ```bash
   NETWORK=hardhat
   FACTORY_ADDRESS=0x<address from step 2>
   ```

4. Start the indexer:

   ```bash
   pnpm dev
   ```

The indexer will connect to `http://127.0.0.1:8545` (override with `PONDER_RPC_URL_HARDHAT` if needed) and start from block 0.

> **Note:** every time you restart `npx hardhat node` contracts are redeployed at new addresses. Update `FACTORY_ADDRESS` and restart `pnpm dev` each time.

## Scripts

```bash
pnpm dev            # start indexer in development mode
pnpm generate-abis  # regenerate ABI TypeScript files from abis/json/
```

---

## Querying the API

The indexer exposes three interfaces at `http://localhost:42069`:

- **GraphQL** — auto-generated per-table queries at `/` and `/graphql`
- **REST** — custom cross-table endpoints described below
- **SQL** — direct Drizzle client at `/sql/*` (dev only)

### GraphQL — single-table queries

After indexes are in place, these work directly via GraphQL:

```graphql
# All Bank deposits for a contract
{
  bankDeposits(where: { contractAddress: "0x..." }) {
    items {
      id
      depositor
      amount
      timestamp
    }
  }
}

# All votes by a user
{
  electionVotes(where: { voter: "0x..." }) {
    items {
      id
      electionId
      contractAddress
    }
  }
}
{
  proposalVotes(where: { voter: "0x..." }) {
    items {
      id
      proposalId
      vote
    }
  }
}

# All proposals for a contract
{
  proposals(where: { contractAddress: "0x..." }) {
    items {
      id
      title
      creator
      startDate
      endDate
    }
  }
}

# Open board actions (executed = false)
{
  boardActions(where: { contractAddress: "0x...", executed: false }) {
    items {
      id
      actionId
      target
      description
    }
  }
}

# Elections for a contract
{
  elections(where: { contractAddress: "0x..." }) {
    items {
      id
      electionId
      title
      createdBy
    }
  }
}
```

---

### REST — custom endpoints

All addresses are case-insensitive hex strings. Bigint fields are returned as strings.

#### GET `/contracts/:address/events`

All indexed events for a single sub-contract, grouped by event type.
The response shape depends on `contractType`.

```bash
curl http://localhost:42069/contracts/0xabc.../events
```

```json
{
  "contractAddress": "0xabc...",
  "contractType": "Bank",
  "teamAddress": "0xofficer...",
  "events": {
    "deposits": [...],
    "tokenDeposits": [...],
    "transfers": [...],
    "tokenTransfers": [...],
    "feesPaid": [...],
    "dividendTriggers": [...]
  }
}
```

Supported `contractType` values and their event groups:

| contractType             | Event groups                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `Bank`                   | `deposits`, `tokenDeposits`, `transfers`, `tokenTransfers`, `feesPaid`, `dividendTriggers` |
| `Elections`              | `elections`, `votes`, `results`                                                            |
| `Proposals`              | `proposals`, `votes`, `tallies`                                                            |
| `BoardOfDirectors`       | `actions`, `approvals`                                                                     |
| `InvestorV1`             | `mints`, `distributed`, `paid`, `failed`                                                   |
| `CashRemunerationEIP712` | `deposits`, `withdrawals`, `tokenWithdrawals`, `wageClaims`                                |
| `SafeDepositRouter`      | `deposits`                                                                                 |
| `ExpenseAccountEIP712`   | `deposits`, `tokenDeposits`, `transfers`, `tokenTransfers`, `approvals`                    |

---

#### GET `/teams/:teamAddress/events`

All events for every sub-contract belonging to a team, grouped by `contractType`.

```bash
curl http://localhost:42069/teams/0xofficer.../events
```

```json
{
  "teamAddress": "0xofficer...",
  "events": {
    "Bank":    { "contractAddress": "0xabc...", "events": { "deposits": [...], ... } },
    "Elections": { "contractAddress": "0xdef...", "events": { "elections": [...], ... } }
  }
}
```

---

#### GET `/teams/:teamAddress/timeline`

Merged, timestamp-sorted event feed across all sub-contracts for a team.
Supports cursor-based pagination.

```bash
# First page
curl "http://localhost:42069/teams/0xofficer.../timeline?limit=50"

# Next page — pass nextBefore from previous response
curl "http://localhost:42069/teams/0xofficer.../timeline?limit=50&before=1699990000"
```

| Query param | Default | Description                                                 |
| ----------- | ------- | ----------------------------------------------------------- |
| `limit`     | `50`    | Max events to return (capped at 200)                        |
| `before`    | now     | Return only events with `timestamp < before` (Unix seconds) |

```json
{
  "teamAddress": "0xofficer...",
  "nextBefore": 1699990000,
  "events": [
    { "eventType": "ElectionCreated",  "timestamp": 1700001000, "contractAddress": "0xdef...", "data": { ... } },
    { "eventType": "BankDeposit",      "timestamp": 1700000500, "contractAddress": "0xabc...", "data": { ... } },
    { "eventType": "BoardActionAdded", "timestamp": 1699999000, "contractAddress": "0xbod...", "data": { ... } }
  ]
}
```

`nextBefore` is `null` when there are no more pages.

---

#### GET `/users/:userAddress/activity`

All activity initiated by a wallet across all contract types, sorted newest first.
Same pagination shape as the timeline endpoint.

```bash
curl "http://localhost:42069/users/0xwallet.../activity?limit=50"
curl "http://localhost:42069/users/0xwallet.../activity?limit=50&before=1699990000"
```

Covers: `BankDeposit`, `BankTokenDeposit`, `BankTransfer`, `BankTokenTransfer`, `ElectionVote`, `ProposalVote`, `BoardApproval`, `InvestorMint`, `InvestorDividendPaid`, `InvestorDividendPaymentFailed`, `CashRemunerationDeposit`, `CashRemunerationWithdraw`, `CashRemunerationWithdrawToken`, `SafeDeposit`, `ExpenseDeposit`, `ExpenseTokenDeposit`, `ExpenseTransfer`, `ExpenseTokenTransfer`.

---

#### GET `/contracts/:address/board-actions`

Board actions for a `BoardOfDirectors` contract. Each action includes its active (non-revoked) approvals nested.

```bash
# All actions
curl http://localhost:42069/contracts/0xbod.../board-actions

# Only open (unexecuted) actions
curl "http://localhost:42069/contracts/0xbod.../board-actions?open=true"
```

```json
{
  "contractAddress": "0xbod...",
  "actions": [
    {
      "id": "0xbod...-1",
      "actionId": "1",
      "target": "0x...",
      "description": "Transfer ownership",
      "data": "0x...",
      "executed": false,
      "approvals": [
        { "approver": "0x...", "revoked": false, ... }
      ]
    }
  ]
}
```

---

#### GET `/contracts/:address/wage-claims`

Latest state of each wage claim for a `CashRemunerationEIP712` contract.
Deduplicated by `signatureHash` — only the most recent event per hash is returned.

```bash
# All wage claims
curl http://localhost:42069/contracts/0xcash.../wage-claims

# Only currently enabled claims
curl "http://localhost:42069/contracts/0xcash.../wage-claims?enabled=true"
```

---

#### GET `/contracts/:address/expense-approvals`

Latest state of each expense approval for an `ExpenseAccountEIP712` contract.
Deduplicated by `signatureHash`.

```bash
# All approvals
curl http://localhost:42069/contracts/0xexpense.../expense-approvals

# Only activated approvals
curl "http://localhost:42069/contracts/0xexpense.../expense-approvals?activated=true"
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
