# CNC Portal - Smart Contracts Overview

## All Contracts

| Contract                                          | File                                                 | Upgradeable       | Purpose                              |
| ------------------------------------------------- | ---------------------------------------------------- | ----------------- | ------------------------------------ |
| [Officer](#officer)                               | `contracts/Officer.sol`                              | Yes (Beacon)      | Central orchestrator & factory       |
| [Bank](#bank)                                     | `contracts/Bank.sol`                                 | Yes (Beacon)      | Treasury & dividend management       |
| [InvestorV1](#investorv1)                         | `contracts/Investor/InvestorV1.sol`                  | Yes (Beacon)      | Equity token (ERC20/shares)          |
| [Elections](#elections)                           | `contracts/Elections/Elections.sol`                  | Yes (Beacon)      | Board of Directors elections         |
| [BoardOfDirectors](#boardofdirectors)             | `contracts/BoardOfDirectors.sol`                     | Yes (Beacon)      | Multi-sig governance                 |
| [Proposals](#proposals)                           | `contracts/Proposals/Proposals.sol`                  | Yes (Beacon)      | Board proposal voting                |
| [ExpenseAccountEIP712](#expenseaccounteip712)     | `contracts/expense-account/ExpenseAccountEIP712.sol` | Yes (Beacon)      | Expense reimbursement                |
| [CashRemunerationEIP712](#cashremunerationeip712) | `contracts/CashRemunerationEIP712.sol`               | Yes (Beacon)      | Wage payment with equity             |
| [Tips](#tips)                                     | `contracts/Tips.sol`                                 | Yes (Transparent) | ETH tip distribution                 |
| [Vesting](#vesting)                               | `contracts/Vesting.sol`                              | Yes (Beacon)      | ERC20 token vesting                  |
| [AdCampaignManager](#adcampaignmanager)           | `contracts/AdCampaignManager.sol`                    | No                | Ad campaign & payment                |
| [SafeDepositRouter](#safedepositrouter)           | `contracts/SafeDepositRouter.sol`                    | Yes               | Token deposit → SHER minting         |
| [FeeCollector](#feecollector)                     | `contracts/FeeCollector.sol`                         | Yes               | Global fee vault                     |
| [Voting](#voting-contract)                        | `contracts/Voting/Voting.sol`                        | Yes (Beacon)      | Combined directive + election voting |
| [FactoryBeacon](#factorybeacon)                   | `contracts/beacons/FactoryBeacon.sol`                | —                 | Officer instance factory             |
| [Beacon](#beacon)                                 | `contracts/beacons/Beacon.sol`                       | —                 | Implementation pointer               |
| [UserBeaconProxy](#userbeaconproxy)               | `contracts/beacons/UserBeaconProxy.sol`              | —                 | Beacon proxy instance                |

---

## Core Organizational Contracts

### Officer

**Path**: `contracts/Officer.sol`

Central hub and factory. Each team deploys one Officer, which manages all other contracts.

**Features**:

- Register beacon addresses per contract type
- Deploy individual or all contracts at once via `deployBeaconProxy()` / `deployAllContracts()`
- Auto-link contracts (Bank↔InvestorV1, Elections→BoD, CashRem→InvestorV1)
- Look up deployed contracts by type via `findDeployedContract()`
- Transfer ownership of deployed contracts to team owner

**Key Functions**:

```
configureBeacon(contractType, beaconAddress)
deployBeaconProxy(contractType, initializerData) → address
deployAllContracts(deployments[]) → address[]
findDeployedContract(contractType) → address
getDeployedContracts() → DeployedContract[]
getConfiguredContractTypes() → string[]
getFeeFor(contractType) → uint16
getFeeCollector() → address
isFeeCollectorToken(tokenAddress) → bool
```

---

### Bank

**Path**: `contracts/Bank.sol`

Organizational treasury. Holds ETH and ERC20 tokens, routes transfers with protocol fees, and triggers push-based dividend distributions via InvestorV1.

**Features**:

- Accept ETH via `receive()` and ERC20 via `depositToken()`
- Transfer ETH/ERC20 to recipients; protocol fee (basis points) deducted and sent to FeeCollector
- ERC20 fee only charged for tokens supported by FeeCollector
- **Push-based dividend distribution** — no claim pattern; funds transfer directly to shareholders in the same transaction
- Resolves InvestorV1 address dynamically via Officer (no stored investor address)
- Pausable and reentrancy-protected

**Key Functions**:

```
depositToken(token, amount)                        // Deposit ERC20
transfer(to, amount)                               // Transfer ETH (with protocol fee)
transferToken(token, to, amount)                   // Transfer ERC20 (with fee if token is FeeCollector-supported)
distributeNativeDividends(amount)                  // Push ETH dividends to all shareholders (onlyOwner)
distributeTokenDividends(token, amount)            // Push ERC20 dividends to all shareholders (onlyOwner)
getBalance() → uint256
getTokenBalance(token) → uint256
```

---

### InvestorV1

**Path**: `contracts/Investor/InvestorV1.sol`

ERC20 equity token (**6 decimals**) with automatic shareholder tracking and push-based dividend distribution.

**Features**:

- ERC20 with auto-tracked shareholder set (added/removed via `_update` hook on every transfer)
- Owner bulk-mints via `distributeMint()`; role-based single-mint via `MINTER_ROLE` (granted to CashRemuneration)
- **Executes dividend distribution** — pushes ETH and ERC20 directly to each shareholder proportionally in one transaction
- `onlyBank` modifier restricts dividend calls to the Bank contract (Bank address resolved via Officer at runtime)
- Last shareholder receives the integer remainder to ensure full, lossless distribution
- 6 decimals (USDC-style precision)

**Key Functions**:

```
distributeMint(shareholders[])                     // Bulk mint (owner only)
individualMint(shareholder, amount)                // Single mint (MINTER_ROLE)
getShareholders() → Shareholder[]
distributeNativeDividends(amount)                  // Push ETH — onlyBank, payable
distributeTokenDividends(token, amount)            // Push ERC20 — onlyBank (Bank pre-funds before calling)
```

---

### Elections

**Path**: `contracts/Elections/Elections.sol`

Formal election system. Creates elections with candidates and eligible voters. Results update BoardOfDirectors.

**Features**:

- Create elections with title, dates, seat count, candidates, and eligible voters list
- Only one ongoing election at a time
- Seat count must be odd (tie prevention)
- Eligible voters cast one vote per election
- Sort candidates by vote count (descending); ties broken by address (ascending)
- Resolves BoardOfDirectors address dynamically via Officer at result publication time
- Results can only be published once all votes cast or end date passed

**Key Functions**:

```
createElection(title, description, startDate, endDate, seatCount, candidates[], voters[]) → id
castVote(electionId, candidateAddress)
publishResults(electionId)                         // Updates BoardOfDirectors
getElectionResults(electionId) → address[]
```

---

### BoardOfDirectors

**Path**: `contracts/BoardOfDirectors.sol`

Multi-signature governance contract. Board members approve actions that auto-execute on majority.

**Features**:

- Board membership set by Elections contract
- Any board member can propose an encoded action
- Majority (>50%) approval required for execution
- Auto-executes approved actions against any target contract
- Board members can revoke their approval
- Self-governance: can modify owners via approved actions (`onlySelf`)

**Key Functions**:

```
addAction(target, description, data) → actionId
approve(actionId)
revoke(actionId)
setBoardOfDirectors(members[])                     // Called by Elections
getBoardOfDirectors() → address[]
isMember(address) → bool
```

---

### Proposals

**Path**: `contracts/Proposals/Proposals.sol`

Formal proposal voting for board decisions. Board members vote Yes/No/Abstain.

**Features**:

- Board members create proposals with title, type, voting period
- Only board members vote; checked live from BoardOfDirectors
- Results auto-tallied once all board members have voted
- Manual tally via `tallyResults()` available
- States: Active → Succeeded / Defeated / Expired

**Key Functions**:

```
createProposal(title, description, proposalType, startDate, endDate) → id
castVote(proposalId, VoteOption)                   // Yes / No / Abstain
tallyResults(proposalId)
```

---

### ExpenseAccountEIP712

**Path**: `contracts/expense-account/ExpenseAccountEIP712.sol`

EIP-712 signed expense system. Owner signs budgets off-chain; employees submit expenses on-chain.

**Features**:

- EIP-712 typed-data budget signatures (off-chain owner approval)
- Three budget constraint types: `TransactionsPerPeriod`, `AmountPerPeriod`, `AmountPerTransaction`
- Period-based usage tracking and reset
- Multi-token support (ETH + ERC20)
- Budget can be revoked by owner

**Key Functions**:

```
submitExpense(recipient, amount, budgetLimit, signature)
addTokenSupport(token)
removeTokenSupport(token)
```

---

### CashRemunerationEIP712

**Path**: `contracts/CashRemunerationEIP712.sol`

Wage payment with EIP-712 signatures. Supports multi-token wages including equity token minting.

**Features**:

- EIP-712 signed wage claims (off-chain owner approval)
- Pay multiple tokens in a single transaction
- Mint InvestorV1 equity tokens as part of compensation
- Claim hash prevents double payment
- Owner can disable specific claims before they're submitted
- Timestamp in claim prevents replay attacks

**Key Functions**:

```
withdraw(wageClaim, signature)                    // Employee withdraws wages
enableClaim(signatureHash)                        // Re-enable a disabled claim
disableClaim(signatureHash)                       // Revoke claim before use
```

---

## Financial Utility Contracts

### Tips

**Path**: `contracts/Tips.sol`

ETH tip distribution to team members. Two modes: push (immediate send) or pull (balance accumulation + withdraw).

**Features**:

- `pushTip`: Immediately sends equal ETH share to each recipient (up to `pushLimit`)
- `sendTip`: Credits balance per recipient; they withdraw later
- Remainder from integer division carried over to next transaction
- Configurable `pushLimit` (default 10, max 100)
- Upgradeable (TransparentProxy), Pausable

**Key Functions**:

```
pushTip(teamMembers[])                            // Direct ETH distribution
sendTip(teamMembers[])                            // Balance-based distribution
withdraw()                                        // Recipient claims balance
getBalance(address) → uint256
updatePushLimit(value)                            // Owner only
```

---

### Vesting

**Path**: `contracts/Vesting.sol`

Linear ERC20 token vesting with cliff periods, organized by teams.

**Features**:

- Team-based: each team has an owner, token, and member list
- Cliff period: no tokens releasable until cliff elapses
- Linear vesting: tokens unlock proportionally after cliff
- Team owner can stop vesting: releasable tokens go to member, unvested tokens return to owner
- Archived history of stopped vestings per member/team
- Upgradeable, Pausable, ReentrancyGuard

**Key Functions**:

```
createTeam(teamId, teamOwner, tokenAddress)
addVesting(teamId, member, start, duration, cliff, totalAmount, token)
release(teamId)                                   // Member claims vested tokens
stopVesting(member, teamId)                       // Owner stops & settles
vestedAmount(member, teamId) → uint256
releasable(member, teamId) → uint256
getTeamVestingsWithMembers(teamId)
getTeamAllArchivedVestingsFlat(teamId)
```

---

### AdCampaignManager

**Path**: `contracts/AdCampaignManager.sol`

Manages advertiser-funded campaigns. Admins claim payments per-click/impression; advertisers can withdraw remaining budget.

**Features**:

- Advertisers create campaigns with ETH budget
- Configurable cost-per-click and cost-per-impression
- Admin/owner claims payment against bank contract (forwards ETH)
- Advertiser or admin can stop campaign and withdraw remainder
- Admin list management (owner adds/removes admins)
- Pausable, ReentrancyGuard
- **Not upgradeable** (standard Ownable)

**Key Functions**:

```
createAdCampaign()                                // Advertiser deposits ETH
claimPayment(campaignCode, currentAmountSpent)    // Admin claims for clicks
requestAndApproveWithdrawal(campaignCode, spent)  // Advertiser withdraws remainder
addAdmin(admin) / removeAdmin(admin)
setBankContractAddress(address)
setCostPerClick(value) / setCostPerImpression(value)
getAdCampaignByCode(campaignCode) → AdCampaign
```

---

### SafeDepositRouter

**Path**: `contracts/SafeDepositRouter.sol`

Deposit whitelisted tokens and receive SHER (InvestorV1) tokens at a configurable multiplier. Deposited tokens go to a Safe wallet.

**Features**:

- Disabled by default — owner must call `enableDeposits()`
- Configurable token multiplier (fixed-point using SHER decimals)
- Formula: `SHER = normalize(tokenAmount, sherDecimals) × multiplier ÷ 10^sherDecimals`
- Slippage protection via `depositWithSlippage(minSherOut)`
- Stores token decimals at whitelist time (prevents manipulation)
- Recovers accidentally sent tokens to Safe via `recoverERC20()`
- Two-level stop: `disableDeposits()` for normal stop, `pause()` for emergency

**Key Functions**:

```
deposit(token, amount)
depositWithSlippage(token, amount, minSherOut)
calculateCompensation(token, amount) → uint256
enableDeposits() / disableDeposits()
addTokenSupport(token) / removeTokenSupport(token)
setMultiplier(newMultiplier)
setSafeAddress(newSafe)
recoverERC20(token, amount)
```

---

### FeeCollector

**Path**: `contracts/FeeCollector.sol`

Global fee vault. Accepts ETH and ERC20 tokens; stores per-contract-type fee configurations (basis points).

**Features**:

- Per-contract-type fee configuration (e.g. `"BANK"` → 50 bps = 0.5%)
- `getFeeFor(contractType)` — query fee for any type (returns 0 if not configured)
- `setFee(contractType, feeBps)` — add or update fee config
- Withdraw accumulated ETH or ERC20 to owner
- Token support management (whitelist)
- Upgradeable, ReentrancyGuard

**Key Functions**:

```
getFeeFor(contractType) → uint16           // e.g. 50 = 0.5%
setFee(contractType, feeBps)               // Add/update fee config
getAllFeeConfigs() → FeeConfig[]
withdraw(amount)                           // Owner withdraws ETH
withdrawToken(token, amount)               // Owner withdraws ERC20
addTokenSupport(token) / removeTokenSupport(token)
getBalance() → uint256
getTokenBalance(token) → uint256
```

---

## Voting Contract

### Voting Contract

**Path**: `contracts/Voting/Voting.sol`

Combined directive and election voting contract. Earlier/alternative to the separate Proposals + Elections contracts. Integrates directly with BoardOfDirectors via Officer.

**Features**:

- Two proposal types: **Directive** (Yes/No/Abstain) and **Election** (candidates with vote counts)
- Configurable voters list and winner count per proposal
- Election tie detection with four resolution options:
  - `RANDOM_SELECTION` — blockhash-based random pick from tied candidates
  - `INCREASE_WINNER_COUNT` — include all tied candidates
  - `FOUNDER_CHOICE` — proposal creator manually selects winner
  - `RUNOFF_ELECTION` — creates a new election with only tied candidates
- Sets BoardOfDirectors winners automatically via Officer lookup
- Proposal creator concludes/resolves the proposal

**Key Functions**:

```
addProposal(title, description, isElection, winnerCount, voters[], candidates[])
voteDirective(proposalId, vote)           // 0=No, 1=Yes, 2=Abstain
voteElection(proposalId, candidateAddress)
concludeProposal(proposalId)              // Creator finalizes
resolveTie(proposalId, TieBreakOption)
selectWinner(proposalId, winner)          // FOUNDER_CHOICE tie-break
getProposalById(proposalId) → Proposal
setBoardOfDirectors(members[])            // Owner override
```

---

## Infrastructure Contracts

### FactoryBeacon

**Path**: `contracts/beacons/FactoryBeacon.sol`

Singleton factory that creates Officer instances via `createBeaconProxy()`. Entry point for team deployment.

### Beacon

**Path**: `contracts/beacons/Beacon.sol`

Stores a single implementation address. All proxies pointing to this beacon share the same logic. Owner calls `upgradeTo(newImpl)` to upgrade all instances at once.

### UserBeaconProxy

**Path**: `contracts/beacons/UserBeaconProxy.sol`

Lightweight proxy that delegates all calls to the implementation returned by its beacon. Created by FactoryBeacon or Officer for each contract instance.

---

## Deployment Overview

| Network           | Chain ID | Deployed Addresses                                                |
| ----------------- | -------- | ----------------------------------------------------------------- |
| Mainnet           | 1        | See `ignition/deployments/chain-1/`                               |
| Sepolia (testnet) | 11155111 | See `ignition/deployments/chain-11155111/deployed_addresses.json` |
| Polygon           | 137      | See `ignition/deployments/chain-137/deployed_addresses.json`      |
| Polygon Amoy      | 80002    | See `ignition/deployments/chain-80002/deployed_addresses.json`    |

---

## Further Reading

- [Technical Architecture](./contracts-technical-architecture.md) — deep-dive on patterns, data flows, upgrade mechanics
- [Architecture Diagrams](./contracts-architecture-diagram.md) — mermaid diagrams for system relationships
- [Quick Reference](./contracts-quick-reference.md) — function signatures, events, error codes, CLI commands

---

_Last Updated: March 2026_
