# CNC Portal - Smart Contracts Documentation

Welcome to the CNC Portal smart contracts documentation! This folder contains comprehensive technical documentation about the contract architecture, deployment, and usage.

## 📚 Documentation Files

### 1. [Technical Architecture](./contracts-technical-architecture.md)
**Complete reference for understanding the smart contract system**

This comprehensive document covers:
- System overview and design principles
- Detailed explanation of each contract
- Contract relationships and dependencies
- Deployment flow and processes
- Data flow diagrams
- User stories for different roles
- Technical details (access control, upgradeability, security)
- Troubleshooting guide

**Read this if you want to**: Understand how the entire contract system works, learn about contract interactions, or implement new features.

---

### 2. [Architecture Diagrams](./contracts-architecture-diagram.md)
**Visual representations of the system**

Contains detailed ASCII diagrams showing:
- High-level system architecture
- Contract interaction maps
- Deployment sequence flows
- Data flow diagrams (dividends, elections, proposals, wages)
- Storage layout for upgradeable contracts

**Read this if you want to**: Visualize the system architecture, understand contract interactions at a glance, or see deployment sequences.

---

### 3. [Quick Reference Guide](./contracts-quick-reference.md)
**Fast lookup for common operations and information**

Provides quick access to:
- Contract summary table
- Common operations with code examples
- Access control reference
- State variables reference
- Events reference
- Error messages and solutions
- File locations
- Environment variables
- Useful commands

**Read this if you want to**: Quickly find how to perform specific operations, look up contract addresses, or troubleshoot errors.

---

## 🚀 Getting Started

### For New Developers
1. Start with [Technical Architecture](./contracts-technical-architecture.md) - Read the Overview and Core Contracts sections
2. Review [Architecture Diagrams](./contracts-architecture-diagram.md) - Understand visual representations
3. Use [Quick Reference](./contracts-quick-reference.md) - For day-to-day development

### For Integrators
1. Check [Quick Reference](./contracts-quick-reference.md) - Contract addresses and ABIs
2. Review Common Operations - Code examples for integration
3. See [Technical Architecture](./contracts-technical-architecture.md) - User Stories section

### For Auditors
1. Read [Technical Architecture](./contracts-technical-architecture.md) - Complete technical details
2. Review Security Features section
3. Check Access Control patterns
4. Examine Upgradeability mechanisms

---

## 🏗️ Architecture Overview

The CNC Portal uses a **Beacon Proxy Pattern** for upgradeable smart contracts:

```
FactoryBeacon (Singleton)
    │
    └─→ Creates Officer Instances (per team)
           │
           └─→ Officer deploys 7 contracts via beacons:
               ├─ Bank
               ├─ InvestorV1
               ├─ Elections → BoardOfDirectors
               ├─ Proposals
               ├─ ExpenseAccountEIP712
               └─ CashRemunerationEIP712
```

### Core Contracts

| Contract | Purpose |
|----------|---------|
| **Officer** | Central hub - deploys and manages all other contracts |
| **Bank** | Treasury management and dividend distribution |
| **InvestorV1** | ERC20 equity tokens representing organizational shares |
| **Elections** | Democratic election system for Board of Directors |
| **BoardOfDirectors** | Multi-signature governance and action approval |
| **Proposals** | Formal proposal voting for board decisions |
| **ExpenseAccountEIP712** | Expense payment system with budget constraints |
| **CashRemunerationEIP712** | Wage payment system with equity compensation |

---

## 🔗 Key Integrations

### Bank ↔ InvestorV1
- Bank queries InvestorV1 for shareholder data
- Proportionally distributes dividends to shareholders

### Elections → BoardOfDirectors
- Elections creates BoD contract automatically
- Election winners become board members

### Proposals → BoardOfDirectors
- Proposals checks BoD for member list
- Only board members can create/vote on proposals

### CashRemuneration → InvestorV1
- CashRemuneration has MINTER_ROLE
- Can mint equity tokens as part of wage payments

---

## 📖 Common Use Cases

### Deploy Team Contracts
```typescript
// Frontend calls FactoryBeacon
FactoryBeacon.createBeaconProxy(encodedOfficerInitData)
```
Result: Officer + 7 child contracts deployed

### Distribute Dividends
```solidity
// 1. Owner deposits dividends
Bank.depositDividends(amount, investorAddress)

// 2. Shareholders claim anytime
Bank.claimDividend()
```

### Conduct Election
```solidity
// 1. Create election
Elections.createElection(title, desc, dates, candidates, voters)

// 2. Voters cast votes
Elections.castVote(electionId, candidateAddress)

// 3. Publish results
Elections.publishResults(electionId)
```

### Pay Wages with Equity
```solidity
// 1. Owner signs wage claim (off-chain)
signature = signWageClaim(claim)

// 2. Employee withdraws
CashRemuneration.withdrawWages(claim, signature)
// Receives both ERC20 tokens AND InvestorV1 equity
```

---

## 🔐 Security Features

1. **Reentrancy Protection**: All critical functions use `nonReentrant` modifier
2. **Pausable**: Emergency pause mechanism for all contracts
3. **Access Control**: Role-based permissions (Owner, Board, MINTER_ROLE)
4. **EIP-712 Signatures**: Secure off-chain approvals with typed data
5. **Upgradeable**: Beacon proxy pattern with storage gap protection

---

## 🛠️ Development Workflow

### Contract Development
```bash
cd contract

# Compile
npm run compile

# Test
npm run test

# Deploy beacons (testnet)
npx hardhat ignition deploy ignition/modules/OfficerModule.ts --network sepolia

# Verify
npx hardhat verify --network sepolia <address>
```

### Frontend Integration
```bash
cd app

# Update contract addresses
# Edit: src/constant.ts

# Update ABIs
# Copy from: contract/artifacts/contracts/

# Run dev server
npm run dev
```

---

## 📁 Repository Structure

```
/contract
  /contracts          # Solidity source files
  /ignition/modules   # Hardhat Ignition deployment scripts
  /test              # Contract test suites
  hardhat.config.ts  # Hardhat configuration

/app
  /src
    /components      # Vue components
    /artifacts/abi   # Contract ABIs
    constant.ts      # Contract addresses

/docs                # This documentation
  contracts-technical-architecture.md
  contracts-architecture-diagram.md
  contracts-quick-reference.md
```

---

## 🧪 Testing

### Run All Tests
```bash
cd contract
npm run test
```

### Run Specific Test
```bash
npx hardhat test test/Officer.test.ts
```

### Test Coverage
```bash
npm run coverage
```

### Gas Report
```bash
REPORT_GAS=true npm run test
```

---

## 🚨 Troubleshooting

### Common Issues

**"Beacon not configured"**
- Ensure beacon addresses are set in Officer
- Check `/app/src/constant.ts` for correct addresses

**"Insufficient unlocked balance"**
- Cannot spend funds locked as dividends
- Only unlocked balance available for transfers

**"Invalid signature"**
- EIP-712 signature doesn't match
- Verify signer is contract owner
- Check wage claim/budget data matches signed data

**"Only board member can call"**
- Function restricted to board members
- Check if address is in BoardOfDirectors

For more troubleshooting, see [Technical Architecture - Troubleshooting Guide](./contracts-technical-architecture.md#troubleshooting-guide)

---

## 📞 Support & Contribution

### Need Help?
- Review documentation in this folder
- Check existing GitHub issues
- Open a new issue with details

### Contributing
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Update documentation if needed
5. Submit pull request

---

## 📋 Changelog

### Version 1.0 (November 2024)
- Initial documentation release
- Complete technical architecture
- Visual diagrams
- Quick reference guide

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file in the repository root.

---

## 🔗 Additional Resources

- **Repository**: https://github.com/globe-and-citizen/cnc-portal
- **OpenZeppelin Docs**: https://docs.openzeppelin.com/contracts
- **Hardhat Docs**: https://hardhat.org/docs
- **EIP-712 Specification**: https://eips.ethereum.org/EIPS/eip-712
- **Beacon Proxy Pattern**: https://docs.openzeppelin.com/contracts/api/proxy#beacon

---

*Last Updated: November 23, 2024*  
*Maintained by: CNC Portal Team*
