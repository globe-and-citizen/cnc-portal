# CNC Portal - Smart Contracts Architecture Diagrams

## High-Level System Architecture

```mermaid
graph TB
    subgraph Blockchain["ETHEREUM BLOCKCHAIN"]
        subgraph BeaconLayer["BEACON LAYER (Shared - Network Wide)"]
            FB["FactoryBeacon<br/>(Officer Impl)"]
            BB["BankBeacon<br/>(Bank Impl)"]
            EB["ElectionsBeacon<br/>(Elections Impl)"]
            BDB["BoDBeacon<br/>(BoD Impl)"]
            PB["ProposalsBeacon<br/>(Proposals Impl)"]
            IB["InvestorBeacon<br/>(InvestorV1 Impl)"]
            EAB["ExpenseBeacon<br/>(ExpenseAccount Impl)"]
            CRB["CashRemBeacon<br/>(CashRem Impl)"]
        end
        
        subgraph TeamInstances["TEAM INSTANCES (Per Organization)"]
            subgraph TeamA["Team A"]
                OA["Officer Proxy"]
                BankA["Bank Proxy"]
                InvA["InvestorV1 Proxy"]
                ElecA["Elections Proxy"]
                BodA["BoD Proxy"]
                PropA["Proposals Proxy"]
                ExpA["Expense Proxy"]
                CashA["CashRem Proxy"]
            end
            
            subgraph TeamB["Team B"]
                OB["Officer Proxy"]
                BankB["Bank Proxy"]
                InvB["InvestorV1 Proxy"]
                ElecB["Elections Proxy"]
                BodB["BoD Proxy"]
                PropB["Proposals Proxy"]
                ExpB["Expense Proxy"]
                CashB["CashRem Proxy"]
            end
        end
    end
    
    FB -.creates.-> OA
    FB -.creates.-> OB
    
    BB -.points to.-> BankA
    BB -.points to.-> BankB
    EB -.points to.-> ElecA
    EB -.points to.-> ElecB
    
    OA --> BankA
    OA --> InvA
    OA --> ElecA
    OA --> PropA
    OA --> ExpA
    OA --> CashA
    
    OB --> BankB
    OB --> InvB
    OB --> ElecB
    OB --> PropB
    OB --> ExpB
    OB --> CashB

    style BeaconLayer fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    style TeamInstances fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style TeamA fill:#f1f8e9,stroke:#558b2f,stroke-width:2px
    style TeamB fill:#f1f8e9,stroke:#558b2f,stroke-width:2px
```

---

## Detailed Contract Interaction Map

```mermaid
graph TB
    Frontend["FRONTEND APPLICATION<br/>DeployContractSection.vue"]
    
    subgraph OfficerHub["OFFICER CONTRACT (Central Hub)"]
        OfficerState["<b>State:</b><br/>• contractBeacons<br/>• deployedContracts<br/>• bodContract"]
        OfficerFuncs["<b>Functions:</b><br/>• initialize()<br/>• deployBeaconProxy()<br/>• deployAllContracts()<br/>• findDeployedContract()"]
    end
    
    Bank["Bank<br/>Contract"]
    InvestorV1["InvestorV1<br/>Contract"]
    Elections["Elections<br/>Contract"]
    BoD["Board of<br/>Directors"]
    Proposals["Proposals<br/>Contract"]
    ExpenseAccount["Expense<br/>Account"]
    CashRem["Cash<br/>Remuneration"]
    
    Frontend -->|"createBeaconProxy()"| OfficerHub
    
    OfficerHub -->|deploys| Bank
    OfficerHub -->|deploys| InvestorV1
    OfficerHub -->|deploys| Elections
    OfficerHub -->|deploys| Proposals
    OfficerHub -->|deploys| ExpenseAccount
    OfficerHub -->|deploys| CashRem
    
    Elections -->|"creates & sets"| BoD
    Bank -.->|reads shareholders| InvestorV1
    Proposals -.->|reads members| BoD
    Bank -->|setInvestorAddress| InvestorV1
    Elections -->|setBoDAddress| BoD
    Proposals -->|setBoDAddress| BoD
    CashRem -->|mints tokens| InvestorV1
    
    style OfficerHub fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    style Frontend fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style Bank fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style InvestorV1 fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style Elections fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style BoD fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style Proposals fill:#e0f2f1,stroke:#00796b,stroke-width:2px
```

### Legend:
- `deploys`: Officer creates contract instance
- `reads`: Contract queries data from another
- `sets`: Contract updates another contract's state
- `mints`: Contract has permission to mint tokens
- `creates`: Contract creates and initializes another

---

## Contract Deployment Sequence

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Frontend<br/>DeployContractSection.vue
    participant FB as FactoryBeacon
    participant Officer as Officer Contract
    participant Bank as Bank Proxy
    participant Investor as InvestorV1 Proxy
    participant Elections as Elections Proxy
    participant BoD as BoardOfDirectors Proxy
    participant Proposals as Proposals Proxy
    participant Expense as ExpenseAccount Proxy
    participant CashRem as CashRemuneration Proxy
    participant Backend as Backend API
    
    User->>Frontend: Clicks "Deploy"
    
    Note over Frontend: 1. Prepare Deployment Data<br/>- Beacon configurations<br/>- Initialization data
    
    Frontend->>FB: createBeaconProxy(encodedOfficerInitData)
    
    FB->>Officer: Create UserBeaconProxy
    activate Officer
    
    Note over Officer: Officer.initialize() executes<br/>Step 1: Configure Beacons<br/>Step 2: Deploy All Contracts
    
    Officer->>Bank: Deploy Bank Proxy
    activate Bank
    Bank-->>Officer: Bank address
    deactivate Bank
    
    Officer->>Investor: Deploy InvestorV1 Proxy
    activate Investor
    Investor-->>Officer: InvestorV1 address
    deactivate Investor
    
    Officer->>Elections: Deploy Elections Proxy
    activate Elections
    Elections->>BoD: Auto-create BoD Proxy
    activate BoD
    BoD-->>Elections: BoD address
    deactivate BoD
    Elections-->>Officer: Elections address
    deactivate Elections
    
    Officer->>Proposals: Deploy Proposals Proxy
    activate Proposals
    Proposals-->>Officer: Proposals address
    deactivate Proposals
    
    Officer->>Expense: Deploy ExpenseAccount Proxy
    activate Expense
    Expense-->>Officer: Expense address
    deactivate Expense
    
    Officer->>CashRem: Deploy CashRemuneration Proxy
    activate CashRem
    CashRem-->>Officer: CashRem address
    deactivate CashRem
    
    Note over Officer: Link Contracts
    Officer->>Bank: setInvestorAddress(InvestorV1)
    Officer->>Elections: setBoDAddress(BoD)
    Officer->>Proposals: setBoDAddress(BoD)
    Officer->>CashRem: addTokenSupport(InvestorV1)
    Officer->>Investor: grantRole(MINTER_ROLE, CashRem)
    Officer->>CashRem: transferOwnership(owner)
    Officer->>Investor: transferOwnership(owner)
    
    deactivate Officer
    
    FB-->>Frontend: Event: BeaconProxyCreated<br/>(proxy, deployer)
    
    Note over Frontend: Listen for Event<br/>useWatchContractEvent
    
    Frontend->>Backend: PUT /teams/:id<br/>{officerAddress}
    Frontend->>Backend: PUT /contract/sync<br/>{teamId}
    
    Note over Backend: Query Officer.getDeployedContracts()<br/>Store all addresses
    
    Backend-->>Frontend: Success
    
    Note over User: Team Contracts Ready!
```

---

## Data Flow: Dividend Distribution

```mermaid
sequenceDiagram
    actor Owner
    participant Bank as Bank Contract
    participant Investor as InvestorV1 Contract
    actor Shareholder
    
    Owner->>Bank: 1. Deposit funds (ETH/ERC20)
    Owner->>Bank: 2. depositDividends(amount, investorAddress)
    
    activate Bank
    Bank->>Investor: 3. getShareholders()
    Investor-->>Bank: shareholders[]
    Bank->>Investor: totalSupply()
    Investor-->>Bank: supply
    
    Note over Bank: 4. Calculate proportional shares<br/>For each shareholder:<br/>share = (amount × balance) / supply
    
    Note over Bank: 5. Credit dividends<br/>dividendBalances[addr] += share<br/>totalDividends += share<br/>emit DividendCredited
    
    Bank-->>Owner: 6. Emit DividendDeposited
    deactivate Bank
    
    Shareholder->>Bank: 7. claimDividend()
    
    activate Bank
    Note over Bank: 8. Validate & transfer<br/>amt = dividendBalances[sender]<br/>require(amt > 0)<br/>dividendBalances[sender] = 0<br/>totalDividends -= amt
    
    Bank->>Shareholder: 9. Transfer dividend payment
    Bank-->>Shareholder: 10. Emit DividendClaimed
    deactivate Bank
```

---

## Data Flow: Board Election

```mermaid
sequenceDiagram
    actor Owner
    participant Elections as Elections Contract
    participant BoD as BoardOfDirectors Contract
    actor Voter
    
    Owner->>Elections: 1. createElection(candidates[], voters[], dates, seats)
    
    activate Elections
    Note over Elections: 2. Store election data<br/>election.id = nextId<br/>election.candidates<br/>election.voters
    Elections-->>Owner: 3. Emit ElectionCreated
    deactivate Elections
    
    Voter->>Elections: 4. castVote(electionId, candidate)
    
    activate Elections
    Note over Elections: 5. Validate & record vote<br/>require(isEligible)<br/>require(!hasVoted)<br/>require(isActive)<br/>votes[voter] = candidate<br/>voteCounts[candidate]++
    Elections-->>Voter: 6. Emit VoteSubmitted
    deactivate Elections
    
    Note over Voter: Repeat for all voters...
    
    Owner->>Elections: 7. publishResults()
    
    activate Elections
    Note over Elections: 8. Calculate winners<br/>Sort by vote count (desc)<br/>winners = top N<br/>election.winners = winners<br/>resultsPublished = true
    
    Elections->>BoD: 9. setBoardOfDirectors(winners)
    
    activate BoD
    Note over BoD: 10. Update members<br/>Clear existing<br/>Add winners[]
    BoD-->>Elections: 11. Emit BoardChanged
    deactivate BoD
    
    Elections-->>Owner: 12. Emit ResultsPublished
    deactivate Elections
```

---

## Data Flow: Proposal Voting

```mermaid
sequenceDiagram
    actor BoardMember as Board Member
    participant Proposals as Proposals Contract
    participant BoD as BoardOfDirectors Contract
    
    BoardMember->>Proposals: Check if member
    Proposals->>BoD: 1. isMember(sender)
    BoD-->>Proposals: 2. true
    
    BoardMember->>Proposals: 3. createProposal(title, desc, dates)
    
    activate Proposals
    Note over Proposals: 4. Store proposal data<br/>proposal.id = nextId<br/>state = Active<br/>totalVoters = BoD.length
    Proposals-->>BoardMember: 5. Emit ProposalCreated
    deactivate Proposals
    
    BoardMember->>Proposals: 6. castVote(proposalId, vote)
    
    Proposals->>BoD: 7. isMember(sender)
    BoD-->>Proposals: 8. true
    
    activate Proposals
    Note over Proposals: 9. Record vote<br/>require(!hasVoted)<br/>require(isActive)<br/>hasVoted[voter] = true<br/>voteCount++<br/>Update counts (yes/no/abstain)
    
    Proposals-->>BoardMember: 10. Emit ProposalVoted
    
    alt All votes cast
        Note over Proposals: 11. Auto-tally results<br/>if (yesCount > noCount)<br/>  state = Succeeded<br/>else if (noCount > yesCount)<br/>  state = Defeated<br/>else<br/>  state = Expired
        Proposals-->>BoardMember: 12. Emit ProposalTallyResults
    end
    deactivate Proposals
```

---

## Data Flow: Wage Payment with Equity

```mermaid
sequenceDiagram
    actor Owner
    actor Employee
    participant CashRem as CashRemuneration Contract
    participant Investor as InvestorV1 Contract
    
    Note over Owner: 1. Sign wage claim (EIP-712)<br/>Off-chain signature
    Owner->>Employee: 2. Provide signature
    
    Employee->>CashRem: 3. withdrawWages(wageClaim, signature)
    
    activate CashRem
    Note over CashRem: 4. Verify EIP-712 signature<br/>Recover signer<br/>require(signer == owner)
    
    Note over CashRem: 5. Validate claim<br/>hash = hashWageClaim()<br/>require(!paidClaims[hash])<br/>require(!disabledClaims[hash])
    
    Note over CashRem: 6. Process each wage<br/>amount = hourlyRate × hours
    
    loop For each wage token
        alt Token is InvestorV1 (equity)
            CashRem->>Investor: 7. individualMint(employee, amount)
            activate Investor
            Note over Investor: 8. Validate MINTER_ROLE<br/>require(hasRole(MINTER_ROLE))<br/>_mint(employee, amount)
            Note over Investor: 9. Update shareholders<br/>if (balance > 0 && !inSet)<br/>  shareholders.add(employee)
            Investor-->>CashRem: 10. Emit Minted
            deactivate Investor
        else Token is ERC20/ETH
            Note over CashRem: 11. Transfer tokens<br/>token.transfer(employee, amt)
        end
    end
    
    Note over CashRem: 12. Mark claim paid<br/>paidWageClaims[hash] = true
    
    CashRem-->>Employee: 13. Emit Withdraw
    CashRem->>Employee: 14. Receive payments<br/>(tokens + equity)
    deactivate CashRem
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
