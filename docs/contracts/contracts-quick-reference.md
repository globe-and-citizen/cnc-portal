# CNC Portal - Smart Contracts Quick Reference

## Contract Summary Table

| Contract | Purpose | Key Functions | Dependencies |
|----------|---------|---------------|--------------|
| **Officer** | Central orchestrator & factory | `deployBeaconProxy()`, `deployAllContracts()`, `findDeployedContract()` | All beacons |
| **Bank** | Treasury & dividend management | `depositDividends()`, `claimDividend()`, `transfer()`, `setInvestorAddress()` | InvestorV1 |
| **InvestorV1** | Equity token (ERC20) | `distributeMint()`, `individualMint()`, `getShareholders()` | None |
| **Elections** | BoD election system | `createElection()`, `castVote()`, `publishResults()` | BoardOfDirectors |
| **BoardOfDirectors** | Multi-sig governance | `addAction()`, `approve()`, `setBoardOfDirectors()` | Elections |
| **Proposals** | Proposal voting | `createProposal()`, `castVote()`, `tallyResults()` | BoardOfDirectors |
| **ExpenseAccountEIP712** | Expense payments | `submitExpense()`, `addTokenSupport()` | None |
| **CashRemunerationEIP712** | Wage payments | `withdrawWages()`, `enableWageClaim()` | InvestorV1 |

---

## Key Contract Addresses (Per Network)

### Mainnet (Production)
```
FactoryBeacon:           TBD
BankBeacon:              TBD
ElectionsBeacon:         TBD
ProposalsBeacon:         TBD
BoardOfDirectorsBeacon:  TBD
InvestorV1Beacon:        TBD
ExpenseAccountBeacon:    TBD
CashRemunerationBeacon:  TBD
```

### Testnet (Sepolia)
```
FactoryBeacon:           Check /app/src/constant.ts
BankBeacon:              Check /app/src/constant.ts
...
```

**Update these in**: `/app/src/constant.ts`

---

## Common Operations

### 1. Deploy Team Contracts

**Frontend**:
```typescript
// /app/src/components/sections/TeamView/forms/DeployContractSection.vue
createOfficer({
  address: OFFICER_BEACON,
  abi: FACTORY_BEACON_ABI,
  functionName: 'createBeaconProxy',
  args: [encodedInitializerData]
})
```

**Result**: Officer + all 7 contracts deployed and linked

---

### 2. Distribute Dividends

**Steps**:
1. Ensure Bank has funds (deposit ETH or ERC20)
2. Owner calls `Bank.depositDividends(amount, investorAddress)`
3. Bank queries InvestorV1 for shareholders
4. Proportional allocation to `dividendBalances`
5. Shareholders call `Bank.claimDividend()` anytime

**Code**:
```solidity
// Owner deposits dividends
Bank.depositDividends{value: 1 ether}(1 ether, investorV1Address);

// Shareholder claims
Bank.claimDividend(); // Receives proportional share
```

---

### 3. Conduct Election

**Steps**:
1. Owner calls `Elections.createElection()` with candidates & voters
2. Eligible voters call `Elections.castVote(electionId, candidate)`
3. After voting period, owner calls `Elections.publishResults(electionId)`
4. Winners automatically become board members in BoD

**Code**:
```solidity
// Create election
uint256 electionId = Elections.createElection(
  "Q1 2024 Board Election",
  "Description...",
  startTimestamp,
  endTimestamp,
  5, // seatCount (odd number)
  candidates,
  eligibleVoters
);

// Vote
Elections.castVote(electionId, candidateAddress);

// Publish results (after voting)
Elections.publishResults(electionId);
```

---

### 4. Create & Vote on Proposal

**Steps**:
1. Board member calls `Proposals.createProposal()`
2. Board members call `Proposals.castVote(proposalId, vote)`
3. After all votes or manual tally, results calculated
4. Proposal state updated (Succeeded/Defeated/Expired)

**Code**:
```solidity
// Create proposal (board member only)
uint256 proposalId = Proposals.createProposal(
  "Budget Increase",
  "Description...",
  "Budget",
  startTimestamp,
  endTimestamp
);

// Vote
Proposals.castVote(proposalId, VoteOption.Yes); // or No, Abstain

// Results auto-calculated after all votes
```

---

### 5. Pay Wages with Equity

**Steps**:
1. Owner signs WageClaim off-chain (EIP-712)
2. Employee calls `CashRemuneration.withdrawWages(wageClaim, signature)`
3. Contract verifies signature and claim validity
4. Transfers tokens (ERC20/ETH) + mints InvestorV1 tokens
5. Marks claim as paid

**Code**:
```solidity
// Off-chain: Owner signs
WageClaim memory claim = WageClaim({
  employeeAddress: employee,
  hoursWorked: 40,
  wages: [
    Wage({ hourlyRate: 50e6, tokenAddress: usdcAddress }),
    Wage({ hourlyRate: 10e6, tokenAddress: investorV1Address }) // Equity
  ],
  date: block.timestamp
});
bytes memory signature = signWageClaim(claim); // Owner's private key

// On-chain: Employee withdraws
CashRemuneration.withdrawWages(claim, signature);
// Receives: 2000 USDC + 400 InvestorV1 tokens
```

---

### 6. Submit Expense

**Steps**:
1. Owner signs BudgetLimit off-chain (EIP-712)
2. Employee calls `ExpenseAccount.submitExpense()`
3. Contract validates budget constraints
4. Transfers funds to recipient

**Code**:
```solidity
// Off-chain: Owner signs budget
BudgetLimit memory budget = BudgetLimit({
  approvedAddress: employee,
  budgetData: [
    BudgetData({
      budgetType: BudgetType.TransactionsPerPeriod,
      value: 10 // Max 10 transactions per period
    }),
    BudgetData({
      budgetType: BudgetType.AmountPerTransaction,
      value: 500e6 // Max $500 per transaction
    })
  ],
  expiry: block.timestamp + 30 days,
  tokenAddress: usdcAddress
});
bytes memory signature = signBudgetLimit(budget);

// On-chain: Submit expense
ExpenseAccount.submitExpense(
  payable(vendor),
  450e6, // $450
  budget,
  signature
);
```

---

### 7. Multi-sig Action

**Steps**:
1. Board member calls `BoD.addAction(target, description, encodedData)`
2. Other board members call `BoD.approve(actionId)`
3. When majority reached, action auto-executes

**Code**:
```solidity
// Create action to transfer funds
bytes memory data = abi.encodeWithSelector(
  Bank.transfer.selector,
  recipient,
  1 ether
);

uint256 actionId = BoD.addAction(
  address(bank),
  "Transfer 1 ETH to recipient",
  data
);

// Other board members approve
BoD.approve(actionId); // Multiple times

// Auto-executes when majority reached
```

---

## Access Control Quick Reference

| Operation | Who Can Call | Modifier |
|-----------|--------------|----------|
| Deploy contracts | Anyone via FactoryBeacon | Public |
| Configure beacons | Officer owner | `onlyOwner` |
| Deploy child contracts | Officer owner | `onlyOwners` |
| Deposit dividends | Bank owner | `onlyOwner` |
| Claim dividends | Any shareholder | Public |
| Transfer funds | Bank owner | `onlyOwner` |
| Set investor address | Bank owner (or first time) | Special |
| Create election | Elections owner | `onlyOwner` |
| Vote in election | Eligible voters | Public (with validation) |
| Publish results | Elections owner | `onlyOwner` |
| Set BoD members | BoD owner (Elections) | `onlyOwner` |
| Add BoD action | Board members | `onlyBoardOfDirectors` |
| Approve action | Board members | `onlyBoardOfDirectors` |
| Create proposal | Board members | `onlyMember` |
| Vote on proposal | Board members | `onlyMember` |
| Submit expense | Approved address | Public (with signature) |
| Withdraw wages | Employee | Public (with signature) |
| Mint InvestorV1 | Owner or MINTER_ROLE | `onlyRole(MINTER_ROLE)` |

---

## State Variables Quick Reference

### Officer
```solidity
mapping(string => address) public contractBeacons;  // ContractType -> BeaconAddress
DeployedContract[] private deployedContracts;       // [{type, address}, ...]
address private bodContract;                        // BoardOfDirectors address
```

### Bank
```solidity
address public investorAddress;                     // InvestorV1 contract
mapping(address => bool) public supportedTokens;    // Token -> Supported?
mapping(address => uint256) public dividendBalances;// Shareholder -> Amount
mapping(address => mapping(address => uint256)) public tokenDividendBalances; // Token -> Shareholder -> Amount
uint256 public totalDividends;                      // Total locked dividends
mapping(address => uint256) public totalTokenDividends; // Token -> Locked amount
```

### InvestorV1
```solidity
EnumerableSet.AddressSet private shareholders;      // Set of shareholder addresses
bytes32 public constant MINTER_ROLE;                // Role for minting tokens
```

### Elections
```solidity
uint256 private _nextElectionId;                    // Counter for election IDs
address public bodAddress;                          // BoardOfDirectors address
mapping(uint256 => Election) private _elections;    // ElectionId -> Election data
mapping(uint256 => mapping(address => address)) private _votes; // ElectionId -> Voter -> Candidate
mapping(uint256 => mapping(address => uint256)) public _voteCounts; // ElectionId -> Candidate -> Count
```

### BoardOfDirectors
```solidity
EnumerableSet.AddressSet private owners;            // Contract owners
EnumerableSet.AddressSet private boardOfDirectors;  // Board member addresses
uint256 public actionCount;                         // Counter for actions
mapping(uint256 => Action) public actions;          // ActionId -> Action data
```

### Proposals
```solidity
mapping(uint256 => Proposal) private proposals;     // ProposalId -> Proposal data
uint256 private _nextProposalId;                    // Counter for proposal IDs
address private boardOfDirectorsContractAddress;    // BoardOfDirectors address
```

### ExpenseAccountEIP712
```solidity
mapping(address => bool) public supportedTokens;    // Token -> Supported?
mapping(bytes32 => ApprovalState) private _approvals; // SignatureHash -> State
mapping(bytes32 => mapping(BudgetType => uint256)) private _usage; // SignatureHash -> BudgetType -> Used
mapping(bytes32 => uint256) private _lastUsageTimestamp; // SignatureHash -> Timestamp
```

### CashRemunerationEIP712
```solidity
mapping(address => bool) public supportedTokens;    // Token -> Supported?
mapping(bytes32 => bool) public paidWageClaims;     // ClaimHash -> Paid?
mapping(bytes32 => bool) public disabledWageClaims; // ClaimHash -> Disabled?
address public officerAddress;                      // Officer contract address
```

---

## Events Quick Reference

### Officer
```solidity
event ContractDeployed(string contractType, address deployedAddress);
event BeaconConfigured(string contractType, address beaconAddress);
event BeaconProxiesDeployed(address[] beaconProxies);
```

### Bank
```solidity
event Deposited(address indexed depositor, uint256 amount);
event TokenDeposited(address indexed depositor, address indexed token, uint256 amount);
event Transfer(address indexed sender, address indexed to, uint256 amount);
event TokenTransfer(address indexed sender, address indexed to, address indexed token, uint256 amount);
event DividendDeposited(address indexed account, uint256 amount, address indexed investorAddress);
event TokenDividendDeposited(address indexed account, address indexed token, uint256 amount, address indexed investorAddress);
event DividendCredited(address indexed account, uint256 amount);
event TokenDividendCredited(address indexed account, address indexed token, uint256 amount);
event DividendClaimed(address indexed account, uint256 amount);
event TokenDividendClaimed(address indexed account, address indexed token, uint256 amount);
event InvestorAddressUpdated(address indexed previousAddress, address indexed newAddress);
```

### InvestorV1
```solidity
event Minted(address indexed shareholder, uint256 amount);
event DividendDistributed(address indexed shareholder, uint256 amount);
event DividendFailed(address indexed shareholder, uint256 amount);
```

### Elections
```solidity
event ElectionCreated(uint256 indexed electionId, string title, address indexed createdBy, uint256 startDate, uint256 endDate, uint256 seatCount);
event VoteSubmitted(uint256 indexed electionId, address indexed voter, address indexed candidate);
event ResultsPublished(uint256 indexed electionId, address[] winners);
```

### BoardOfDirectors
```solidity
event BoardOfDirectorsChanged(address[] boardOfDirectors);
event OwnersChanged(address[] owners);
event ActionAdded(uint256 indexed id, address indexed target, string description, bytes data);
event ActionExecuted(uint256 indexed id, address indexed target, string description, bytes data);
event Approval(uint256 indexed id, address indexed approver);
event Revocation(uint256 indexed id, address indexed approver);
```

### Proposals
```solidity
event ProposalCreated(uint256 indexed proposalId, string title, address indexed creator, uint256 startDate, uint256 endDate);
event ProposalVoted(uint256 indexed proposalId, address indexed voter, VoteOption vote, uint256 timestamp);
event ProposalTallyResults(uint256 indexed proposalId, ProposalState state, uint256 yesCount, uint256 noCount, uint256 abstainCount);
```

### ExpenseAccountEIP712
```solidity
event ExpenseSubmitted(address indexed recipient, uint256 amount, address indexed tokenAddress);
event BudgetApproved(address indexed approvedAddress, bytes32 indexed signatureHash);
event BudgetRevoked(address indexed approvedAddress, bytes32 indexed signatureHash);
```

### CashRemunerationEIP712
```solidity
event Deposited(address indexed depositor, uint256 amount);
event Withdraw(address indexed withdrawer, uint256 amount);
event WageClaimEnabled(bytes32 indexed signatureHash);
event WageClaimDisabled(bytes32 indexed signatureHash);
```

---

## Error Messages Quick Reference

### Common Errors
| Error | Meaning | Solution |
|-------|---------|----------|
| `"Beacon not configured for this contract type"` | Officer doesn't have beacon address | Configure beacon first |
| `"Invalid beacon address"` | Zero address provided | Use valid beacon address |
| `"Insufficient unlocked balance"` | Trying to spend locked dividends | Only spend unlocked funds |
| `"Unsupported token"` | Token not in supported list | Add token support first |
| `"Nothing to release"` | No dividends to claim | Wait for dividend allocation |
| `"Already approved"` | Trying to approve twice | Already approved this action |
| `"Only board of directors can call"` | Non-member trying BoD function | Must be board member |
| `"Invalid signature"` | EIP-712 signature invalid | Check signer and data match |
| `"Already paid"` | Wage claim resubmitted | Cannot pay same claim twice |

### Elections Errors
```solidity
error ElectionNotFound();              // Election ID doesn't exist
error ElectionNotActive();             // Voting period not active
error ElectionIsOngoing();             // Cannot create while election ongoing
error ElectionEnded();                 // Voting period ended
error AlreadyVoted();                  // Voter already cast vote
error NotEligibleVoter();              // Address not in eligible list
error ResultsAlreadyPublished();       // Results already published
error ResultsNotReady();               // Not all votes in or period not ended
```

### Proposals Errors
```solidity
error ProposalNotFound();              // Proposal ID doesn't exist
error ProposalVotingNotStarted();      // Voting period hasn't started
error ProposalVotingEnded();           // Voting period ended
error ProposalAlreadyVoted();          // Already voted on this proposal
error OnlyBoardMember();               // Only board members can call
error NoBoardMembers();                // Board is empty
error BoardOfDirectorAddressNotSet();  // BoD address not configured
```

---

## File Locations Quick Reference

### Smart Contracts
| File | Path |
|------|------|
| Officer | `/contract/contracts/Officer.sol` |
| Bank | `/contract/contracts/Bank.sol` |
| InvestorV1 | `/contract/contracts/Investor/InvestorV1.sol` |
| Elections | `/contract/contracts/Elections/Elections.sol` |
| BoardOfDirectors | `/contract/contracts/BoardOfDirectors.sol` |
| Proposals | `/contract/contracts/Proposals/Proposals.sol` |
| ExpenseAccountEIP712 | `/contract/contracts/expense-account/ExpenseAccountEIP712.sol` |
| CashRemunerationEIP712 | `/contract/contracts/CashRemunerationEIP712.sol` |
| FactoryBeacon | `/contract/contracts/beacons/FactoryBeacon.sol` |
| Beacon | `/contract/contracts/beacons/Beacon.sol` |

### Deployment Scripts
| Module | Path |
|--------|------|
| OfficerModule | `/contract/ignition/modules/OfficerModule.ts` |
| BankBeaconModule | `/contract/ignition/modules/BankBeaconModule.ts` |
| ElectionsModule | `/contract/ignition/modules/ElectionsModule.ts` |
| ProposalModule | `/contract/ignition/modules/ProposalModule.ts` |
| BoardOfDirectorsBeaconModule | `/contract/ignition/modules/BoardOfDirectorsBeaconModule.ts` |
| InvestorsV1BeaconModule | `/contract/ignition/modules/InvestorsV1BeaconModule.ts` |
| ExpenseAccountEIP712Module | `/contract/ignition/modules/ExpenseAccountEIP712Module.ts` |
| CashRemunerationEIP712Module | `/contract/ignition/modules/CashRemunerationEIP712Module.ts` |

### Frontend
| Component | Path |
|-----------|------|
| Deploy Contracts | `/app/src/components/sections/TeamView/forms/DeployContractSection.vue` |
| Constants | `/app/src/constant.ts` |
| ABIs | `/app/src/artifacts/abi/` |

### Tests
| Test Suite | Path |
|------------|------|
| Officer Tests | `/contract/test/Officer.test.ts` |
| Bank Tests | `/contract/test/Bank.test.ts` |
| Elections Tests | `/contract/test/Elections.test.ts` |
| Proposals Tests | `/contract/test/Proposals.test.ts` |
| Integration Tests | `/contract/test/integration/` |

---

## Environment Variables

### Backend
```bash
SECRET_KEY=<jwt_secret>
DATABASE_URL=<postgresql_url>
FRONTEND_URL=<frontend_url>
CHAIN_ID=<network_chain_id>
```

### Frontend
```bash
VITE_APP_BACKEND_URL=<backend_api_url>
VITE_APP_NETWORK_ALIAS=<network_name>
VITE_APP_ETHERSCAN_URL=<block_explorer_url>
```

### Contract Deployment
```bash
ALCHEMY_API_KEY=<alchemy_key>
ALCHEMY_HTTP=<alchemy_http_url>
PRIVATE_KEY=<deployer_private_key>
```

---

## Useful Commands

### Contract Development
```bash
# Compile contracts
cd contract && npm run compile

# Run tests
npm run test

# Run specific test file
npx hardhat test test/Officer.test.ts

# Deploy beacons (testnet)
npx hardhat ignition deploy ignition/modules/OfficerModule.ts --network sepolia

# Verify contract
npx hardhat verify --network sepolia <address> <constructor_args>

# Check contract size
npx hardhat size-contracts
```

### Frontend Development
```bash
# Run frontend
cd app && npm run dev

# Build frontend
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

### Database Operations
```bash
# Run migrations
cd backend && npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# View database
npx prisma studio
```

---

## Testing Checklist

### After Deploying Beacons
- [ ] Verify all beacon addresses on explorer
- [ ] Update addresses in `/app/src/constant.ts`
- [ ] Test creating Officer instance
- [ ] Verify all contracts deployed correctly

### After Team Deployment
- [ ] Verify Officer proxy address stored
- [ ] Check all child contracts deployed
- [ ] Test Bank deposit and transfer
- [ ] Test InvestorV1 minting
- [ ] Create and complete test election
- [ ] Create and vote on test proposal
- [ ] Submit test expense
- [ ] Submit test wage claim

### Before Production
- [ ] Full security audit
- [ ] Gas optimization review
- [ ] Upgrade path tested
- [ ] Documentation complete
- [ ] Frontend integrated and tested
- [ ] Backend integrated and tested

---

*Document Version: 1.0*  
*Last Updated: November 23, 2024*  
*Maintained by: CNC Portal Team*
