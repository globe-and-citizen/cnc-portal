# CNC Portal - Smart Contracts Architecture Diagrams

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ETHEREUM BLOCKCHAIN                                 │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    BEACON LAYER (Shared)                            │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │FactoryBeacon │  │  BankBeacon  │  │ElectionsBeac │  ...more    │    │
│  │  │              │  │              │  │on            │             │    │
│  │  │   Officer    │  │    Bank      │  │  Elections   │             │    │
│  │  │     Impl     │  │    Impl      │  │    Impl      │             │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │    │
│  │         │                 │                 │                       │    │
│  └─────────┼─────────────────┼─────────────────┼───────────────────────┘    │
│            │                 │                 │                            │
│            │  creates        │  points to      │  points to                 │
│            ▼                 ▼                 ▼                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TEAM INSTANCES (Per Organization)                 │   │
│  │                                                                       │   │
│  │  Team A:                                                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  Officer → Bank → Elections → Proposals → BoD → ...         │    │   │
│  │  │  Proxy     Proxy   Proxy       Proxy      Proxy             │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  │  Team B:                                                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  Officer → Bank → Elections → Proposals → BoD → ...         │    │   │
│  │  │  Proxy     Proxy   Proxy       Proxy      Proxy             │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  │  Team N: ...                                                         │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Contract Interaction Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND APPLICATION                               │
│                                                                              │
│   DeployContractSection.vue  →  FactoryBeacon.createBeaconProxy()          │
│                                                                              │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OFFICER CONTRACT (Central Hub)                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ State:                                                                │  │
│  │ • contractBeacons: Map<ContractType, BeaconAddress>                  │  │
│  │ • deployedContracts: Array<{type, address}>                          │  │
│  │ • bodContract: address                                                │  │
│  │                                                                        │  │
│  │ Functions:                                                             │  │
│  │ • initialize(owner, beaconConfigs, deployments, isDeployAll)         │  │
│  │ • configureBeacon(contractType, beaconAddress)                        │  │
│  │ • deployBeaconProxy(contractType, initData) → address                │  │
│  │ • deployAllContracts(deployments[]) → addresses[]                     │  │
│  │ • findDeployedContract(contractType) → address                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────────┘
   │         │         │         │         │         │         │
   │ deploys │ deploys │ deploys │ deploys │ deploys │ deploys │ deploys
   │         │         │         │         │         │         │
   ▼         ▼         ▼         ▼         ▼         ▼         ▼

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  Bank  │ │Investor│ │Election│ │  BoD   │ │Proposal│ │Expense │ │  Cash  │
│        │ │   V1   │ │   s    │ │        │ │   s    │ │Account │ │  Rem   │
└───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └────────┘ └───┬────┘
    │          │          │          │          │                       │
    │          │          │          │          │                       │
    │          │          │          │          │                       │
    │  reads   │          │ creates  │          │   reads               │ mints
    │  ◄───────┤          │  & sets  │          │   ◄───────────────────┤
    │          │          ├─────────►│          │                       │
    │          │          │          │          │                       │
    │          │          │          │  reads   │                       │
    │          │          │          │  ◄───────┤                       │
    │          │          │          │          │                       │
    │          │          │          │          │                       │
    │  sets    │          │   sets   │          │    sets               │
    └─────────►│          └─────────►│          └──────►│               │
               │                     │                  │               │
               │◄────────────────────┴──────────────────┴───────────────┘
```

### Legend:
- `deploys`: Officer creates contract instance
- `reads`: Contract queries data from another
- `sets`: Contract updates another contract's state
- `mints`: Contract has permission to mint tokens
- `creates`: Contract creates and initializes another

---

## Contract Deployment Sequence

```
┌──────────┐
│  START   │
│          │
│   User   │
│  Clicks  │
│ "Deploy" │
└────┬─────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Frontend: Prepare Deployment Data       │
│                                         │
│ 1. Beacon Configurations:               │
│    - Bank Beacon Address                │
│    - Elections Beacon Address           │
│    - Proposals Beacon Address           │
│    - BoD Beacon Address                 │
│    - InvestorV1 Beacon Address          │
│    - ExpenseAccount Beacon Address      │
│    - CashRemuneration Beacon Address    │
│                                         │
│ 2. Initialization Data (encoded):       │
│    - Bank: [tokenAddresses, owner]      │
│    - InvestorV1: [name, symbol, owner]  │
│    - Elections: [owner]                 │
│    - Proposals: [owner]                 │
│    - ExpenseAccount: [owner, tokens]    │
│    - CashRemuneration: [owner, tokens]  │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Transaction: Call FactoryBeacon         │
│                                         │
│ FactoryBeacon.createBeaconProxy(        │
│   encodedOfficerInitData                │
│ )                                       │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ FactoryBeacon: Create Officer Proxy     │
│                                         │
│ new UserBeaconProxy(                    │
│   officerBeacon,                        │
│   encodedInitData                       │
│ )                                       │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Officer.initialize() Executes           │
│                                         │
│ Step 1: Configure Beacons               │
│   - Store all beacon addresses          │
│   - Validate no duplicates              │
│                                         │
│ Step 2: Deploy All Contracts            │
│   if isDeployAllContracts == true       │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Officer.deployAllContracts()            │
│                                         │
│ FOR EACH deployment data:               │
│   ┌─────────────────────────────────┐  │
│   │ 1. Bank Proxy                   │  │
│   │    new BeaconProxy(              │  │
│   │      bankBeacon,                 │  │
│   │      initData                    │  │
│   │    )                             │  │
│   └─────────────────────────────────┘  │
│   ┌─────────────────────────────────┐  │
│   │ 2. InvestorV1 Proxy             │  │
│   │    new BeaconProxy(              │  │
│   │      investorBeacon,             │  │
│   │      initData                    │  │
│   │    )                             │  │
│   └─────────────────────────────────┘  │
│   ┌─────────────────────────────────┐  │
│   │ 3. Elections Proxy              │  │
│   │    new BeaconProxy(              │  │
│   │      electionsBeacon,            │  │
│   │      initData                    │  │
│   │    )                             │  │
│   │    ⮑ SPECIAL: Auto-creates       │  │
│   │      BoardOfDirectors Proxy      │  │
│   └─────────────────────────────────┘  │
│   ┌─────────────────────────────────┐  │
│   │ 4. Proposals Proxy              │  │
│   └─────────────────────────────────┘  │
│   ┌─────────────────────────────────┐  │
│   │ 5. ExpenseAccount Proxy         │  │
│   └─────────────────────────────────┘  │
│   ┌─────────────────────────────────┐  │
│   │ 6. CashRemuneration Proxy       │  │
│   └─────────────────────────────────┘  │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Officer: Link Contracts                 │
│                                         │
│ • Bank.setInvestorAddress(InvestorV1)   │
│ • Elections.setBoDAddress(BoD)          │
│ • Proposals.setBoDAddress(BoD)          │
│ • CashRem.addTokenSupport(InvestorV1)   │
│ • InvestorV1.grantRole(                 │
│     MINTER_ROLE,                        │
│     CashRemuneration                    │
│   )                                     │
│ • CashRem.transferOwnership(owner)      │
│ • InvestorV1.transferOwnership(owner)   │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Event: BeaconProxyCreated               │
│                                         │
│ {                                       │
│   proxy: officerProxyAddress,           │
│   deployer: userAddress                 │
│ }                                       │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Frontend: Listen for Event              │
│                                         │
│ useWatchContractEvent({                 │
│   eventName: 'BeaconProxyCreated',      │
│   onLogs: (logs) => {                   │
│     if (valid) {                        │
│       updateDatabase()                  │
│     }                                   │
│   }                                     │
│ })                                      │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Backend: Update Database                │
│                                         │
│ 1. PUT /teams/:id                       │
│    { officerAddress: proxy }            │
│                                         │
│ 2. PUT /contract/sync                   │
│    { teamId: id }                       │
│    - Queries Officer.getDeployedContracts()│
│    - Stores all contract addresses      │
└────┬────────────────────────────────────┘
     │
     ▼
┌──────────┐
│   DONE   │
│          │
│   Team   │
│ Contracts│
│  Ready!  │
└──────────┘
```

---

## Data Flow: Dividend Distribution

```
                  OWNER                        BANK CONTRACT
                    │                               │
                    │ 1. Deposit funds              │
                    ├──────────────────────────────►│
                    │    (ETH or ERC20 tokens)      │
                    │                               │
                    │                               │
                    │ 2. depositDividends()         │
                    ├──────────────────────────────►│
                    │    amount, investorAddress    │
                    │                               │
                    │                               │
                    │                        3. Get shareholders
                    │                               ├─────────┐
                    │                               │         │
                    │                               │◄────────┘
                    │                               │ InvestorV1.getShareholders()
                    │                               │ InvestorV1.totalSupply()
                    │                               │
                    │                      4. Calculate shares
                    │                               ├─────────┐
                    │                               │         │
                    │                               │         │
                    │                               │  For each shareholder:
                    │                               │  share = (amount * balance) / supply
                    │                               │         │
                    │                               │◄────────┘
                    │                               │
                    │                      5. Credit dividends
                    │                               ├─────────┐
                    │                               │         │
                    │                               │  dividendBalances[addr] += share
                    │                               │  totalDividends += share
                    │                               │  emit DividendCredited(addr, share)
                    │                               │         │
                    │                               │◄────────┘
                    │                               │
                    │ 6. Emit DividendDeposited     │
                    │◄──────────────────────────────┤
                    │                               │

  SHAREHOLDER                                       │
      │                                             │
      │ 7. claimDividend()                          │
      ├────────────────────────────────────────────►│
      │                                             │
      │                                    8. Validate & transfer
      │                                             ├─────────┐
      │                                             │         │
      │                                             │  amt = dividendBalances[msg.sender]
      │                                             │  require(amt > 0)
      │                                             │  dividendBalances[msg.sender] = 0
      │                                             │  totalDividends -= amt
      │                                             │  transfer(msg.sender, amt)
      │                                             │         │
      │                                             │◄────────┘
      │                                             │
      │ 9. Receive dividend payment                 │
      │◄────────────────────────────────────────────┤
      │    (ETH or ERC20 tokens)                    │
      │                                             │
      │ 10. Emit DividendClaimed                    │
      │◄────────────────────────────────────────────┤
      │                                             │
```

---

## Data Flow: Board Election

```
   OWNER                ELECTIONS CONTRACT         BoD CONTRACT
     │                         │                        │
     │ 1. createElection()     │                        │
     ├────────────────────────►│                        │
     │   - candidates[]        │                        │
     │   - eligibleVoters[]    │                        │
     │   - dates, seatCount    │                        │
     │                         │                        │
     │                  2. Store election data          │
     │                         ├──────────┐             │
     │                         │          │             │
     │                         │  election.id = nextId  │
     │                         │  election.candidates   │
     │                         │  election.voters       │
     │                         │          │             │
     │                         │◄─────────┘             │
     │                         │                        │
     │ 3. Emit ElectionCreated │                        │
     │◄────────────────────────┤                        │
     │                         │                        │

  VOTER                        │                        │
    │                          │                        │
    │ 4. castVote()            │                        │
    ├─────────────────────────►│                        │
    │   electionId, candidate  │                        │
    │                          │                        │
    │                   5. Validate & record vote       │
    │                          ├──────────┐             │
    │                          │          │             │
    │                          │  require(isEligible)   │
    │                          │  require(!hasVoted)    │
    │                          │  require(isActive)     │
    │                          │  votes[voter] = candidate│
    │                          │  voteCounts[candidate]++│
    │                          │          │             │
    │                          │◄─────────┘             │
    │                          │                        │
    │ 6. Emit VoteSubmitted    │                        │
    │◄─────────────────────────┤                        │
    │                          │                        │
    │                          │                        │
    ... (repeat for all voters)                         │
    │                          │                        │

  OWNER                        │                        │
    │                          │                        │
    │ 7. publishResults()      │                        │
    ├─────────────────────────►│                        │
    │                          │                        │
    │                   8. Calculate winners            │
    │                          ├──────────┐             │
    │                          │          │             │
    │                          │  Sort candidates by    │
    │                          │  vote count (desc)     │
    │                          │  winners = top N       │
    │                          │  election.winners = winners│
    │                          │  election.resultsPublished = true│
    │                          │          │             │
    │                          │◄─────────┘             │
    │                          │                        │
    │                          │ 9. Update BoD          │
    │                          ├───────────────────────►│
    │                          │   setBoardOfDirectors(winners)│
    │                          │                        │
    │                          │                 10. Update members
    │                          │                        ├──────────┐
    │                          │                        │          │
    │                          │                        │  Clear existing
    │                          │                        │  Add winners[]
    │                          │                        │          │
    │                          │                        │◄─────────┘
    │                          │                        │
    │                          │ 11. Emit BoardChanged  │
    │                          │◄───────────────────────┤
    │                          │                        │
    │ 12. Emit ResultsPublished│                        │
    │◄─────────────────────────┤                        │
    │                          │                        │
```

---

## Data Flow: Proposal Voting

```
  BOARD MEMBER          PROPOSALS CONTRACT        BoD CONTRACT
      │                        │                       │
      │                        │ 1. Check isMember()   │
      │                        ├──────────────────────►│
      │                        │                       │
      │                        │ 2. Return true        │
      │                        │◄──────────────────────┤
      │                        │                       │
      │ 3. createProposal()    │                       │
      ├───────────────────────►│                       │
      │   - title, description │                       │
      │   - dates              │                       │
      │                        │                       │
      │                 4. Store proposal data         │
      │                        ├──────────┐            │
      │                        │          │            │
      │                        │  proposal.id = nextId │
      │                        │  proposal.state = Active│
      │                        │  proposal.totalVoters = │
      │                        │    BoD.getBoardOfDirectors().length│
      │                        │          │            │
      │                        │◄─────────┘            │
      │                        │                       │
      │ 5. Emit ProposalCreated│                       │
      │◄───────────────────────┤                       │
      │                        │                       │

  BOARD MEMBER                 │                       │
      │                        │                       │
      │ 6. castVote()          │                       │
      ├───────────────────────►│                       │
      │   proposalId, vote     │                       │
      │                        │                       │
      │                        │ 7. Check isMember()   │
      │                        ├──────────────────────►│
      │                        │                       │
      │                        │ 8. Return true        │
      │                        │◄──────────────────────┤
      │                        │                       │
      │                 9. Record vote                 │
      │                        ├──────────┐            │
      │                        │          │            │
      │                        │  require(!hasVoted)   │
      │                        │  require(isActive)    │
      │                        │  hasVoted[voter] = true│
      │                        │  voteCount++          │
      │                        │  if (Yes) yesCount++  │
      │                        │  if (No) noCount++    │
      │                        │  if (Abstain) abstainCount++│
      │                        │          │            │
      │                        │◄─────────┘            │
      │                        │                       │
      │ 10. Emit ProposalVoted │                       │
      │◄───────────────────────┤                       │
      │                        │                       │
      │                        │ 11. If all voted,     │
      │                        │     tallyResults()    │
      │                        ├──────────┐            │
      │                        │          │            │
      │                        │  if (voteCount == totalVoters) {│
      │                        │    if (yesCount > noCount)│
      │                        │      state = Succeeded │
      │                        │    else if (noCount > yesCount)│
      │                        │      state = Defeated  │
      │                        │    else                │
      │                        │      state = Expired   │
      │                        │  }          │            │
      │                        │◄─────────┘            │
      │                        │                       │
      │ 12. Emit ProposalTallyResults                  │
      │◄───────────────────────┤                       │
      │                        │                       │
```

---

## Data Flow: Wage Payment with Equity

```
  OWNER (off-chain)           EMPLOYEE           CashRemuneration      InvestorV1
         │                        │                    CONTRACT          CONTRACT
         │                        │                       │                 │
   1. Sign wage claim            │                       │                 │
      (EIP-712)                  │                       │                 │
         │                        │                       │                 │
         │ 2. Provide signature   │                       │                 │
         └───────────────────────►│                       │                 │
                                  │                       │                 │
                                  │ 3. withdrawWages()    │                 │
                                  ├──────────────────────►│                 │
                                  │  wageClaim, signature │                 │
                                  │                       │                 │
                                  │             4. Verify signature         │
                                  │                       ├────────┐        │
                                  │                       │        │        │
                                  │                       │  Recover signer │
                                  │                       │  from EIP-712   │
                                  │                       │  require(signer == owner())│
                                  │                       │        │        │
                                  │                       │◄───────┘        │
                                  │                       │                 │
                                  │             5. Validate claim           │
                                  │                       ├────────┐        │
                                  │                       │        │        │
                                  │                       │  hash = hashWageClaim()│
                                  │                       │  require(!paidClaims[hash])│
                                  │                       │  require(!disabledClaims[hash])│
                                  │                       │        │        │
                                  │                       │◄───────┘        │
                                  │                       │                 │
                                  │             6. Process each wage        │
                                  │                       ├────────┐        │
                                  │                       │        │        │
                                  │                       │  for wage in wages:│
                                  │                       │    amount = hourlyRate * hours│
                                  │                       │        │        │
                                  │                       │    if (token == InvestorV1):│
                                  │                       │      mint tokens│
                                  │                       │    else:        │
                                  │                       │      transfer tokens│
                                  │                       │        │        │
                                  │                       │◄───────┘        │
                                  │                       │                 │
                                  │             7. Mint InvestorV1 tokens   │
                                  │                       ├────────────────►│
                                  │                       │  individualMint(employee, amount)│
                                  │                       │                 │
                                  │                       │        8. Validate role
                                  │                       │                 ├────────┐
                                  │                       │                 │        │
                                  │                       │                 │  require(hasRole(MINTER_ROLE, cashRem))│
                                  │                       │                 │  _mint(employee, amount)│
                                  │                       │                 │        │
                                  │                       │                 │◄───────┘
                                  │                       │                 │
                                  │                       │        9. Update shareholders
                                  │                       │                 ├────────┐
                                  │                       │                 │        │
                                  │                       │                 │  if (balance > 0 && !inSet)│
                                  │                       │                 │    shareholders.add(employee)│
                                  │                       │                 │        │
                                  │                       │                 │◄───────┘
                                  │                       │                 │
                                  │                       │ 10. Emit Minted │
                                  │                       │◄────────────────┤
                                  │                       │                 │
                                  │             11. Transfer other tokens   │
                                  │                       ├────────┐        │
                                  │                       │        │        │
                                  │                       │  for other wages:│
                                  │                       │    token.transfer(employee, amt)│
                                  │                       │        │        │
                                  │                       │◄───────┘        │
                                  │                       │                 │
                                  │             12. Mark claim paid         │
                                  │                       ├────────┐        │
                                  │                       │        │        │
                                  │                       │  paidWageClaims[hash] = true│
                                  │                       │        │        │
                                  │                       │◄───────┘        │
                                  │                       │                 │
                                  │ 13. Emit Withdraw     │                 │
                                  │◄──────────────────────┤                 │
                                  │                       │                 │
                                  │ 14. Receive payments  │                 │
                                  │    (tokens + equity)  │                 │
                                  │◄──────────────────────┤                 │
                                  │                       │                 │
```

---

## Storage Layout (Upgradeable Contracts)

### Why Storage Layout Matters

When upgrading contracts via beacons, new implementations must maintain compatible storage layout:

```
OLD IMPLEMENTATION                NEW IMPLEMENTATION
┌─────────────────┐             ┌─────────────────┐
│ Slot 0: owner   │             │ Slot 0: owner   │  ✓ Same
│ Slot 1: paused  │             │ Slot 1: paused  │  ✓ Same
│ Slot 2: counter │             │ Slot 2: counter │  ✓ Same
│                 │             │ Slot 3: newVar  │  ✓ New slot OK
└─────────────────┘             └─────────────────┘

WRONG UPGRADE                    RIGHT UPGRADE
┌─────────────────┐             ┌─────────────────┐
│ Slot 0: owner   │             │ Slot 0: owner   │
│ Slot 1: newVar  │  ✗ Changed! │ Slot 1: paused  │
│ Slot 2: paused  │             │ Slot 2: counter │
│ Slot 3: counter │             │ Slot 3: newVar  │
└─────────────────┘             └─────────────────┘
```

### Storage Gaps

All upgradeable contracts include storage gaps for future variables:

```solidity
contract InvestorV1 {
    // Existing storage
    EnumerableSet.AddressSet private shareholders;  // Slot 0-N
    
    // Storage gap (reserves 50 slots)
    uint256[50] private __gap;                      // For future use
}
```

This allows adding new variables in future upgrades without breaking existing data.

---

*Document Version: 1.0*  
*Last Updated: November 23, 2024*  
*Maintained by: CNC Portal Team*
