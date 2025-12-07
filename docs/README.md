# CNC Portal Documentation

Welcome to the CNC Portal documentation. This directory contains comprehensive documentation for all aspects of the platform.

## 📚 Documentation Structure

```
docs/
├── README.md                           # This file - Documentation index
├── platform/                           # Platform-wide specifications
│   ├── architecture.md                # System architecture
│   ├── security.md                    # Security standards & requirements
│   ├── performance.md                 # Performance standards & optimization
│   ├── testing-strategy.md            # Testing standards & guidelines
│   ├── deployment.md                  # Deployment procedures
│   └── development-standards.md       # Code quality & development standards
├── features/                          # Feature-specific documentation
│   └── stats/                         # Statistics feature
│       ├── functional-specification.md
│       ├── stats-api.md
│       └── stats-dashboard-integration.md
├── auth/                              # Authentication documentation
│   ├── README.md
│   ├── app-authentication.md
│   └── dashboard-authentication.md
└── contracts/                         # Smart contracts documentation
    ├── contracts-architecture-diagram.md
    ├── contracts-quick-reference.md
    └── contracts-technical-architecture.md
```

## 🎯 Quick Navigation

### Platform Documentation

**Core Platform:**

- [Architecture](./platform/architecture.md) - System architecture and component relationships
- [Security](./platform/security.md) - Security standards, authentication, authorization
- [Performance](./platform/performance.md) - Performance requirements and optimization
- [Testing Strategy](./platform/testing-strategy.md) - Testing standards for the entire platform
- [Deployment](./platform/deployment.md) - Deployment procedures and environment setup
- [Development Standards](./platform/development-standards.md) - Code quality and conventions

### Feature Documentation

**Statistics Feature:**

- [Functional Specification](./features/stats/functional-specification.md) - Complete feature specification
- [API Documentation](./features/stats/stats-api.md) - REST API reference
- [Dashboard Integration](./features/stats/stats-dashboard-integration.md) - Frontend integration guide

### Authentication

- [Authentication Overview](./auth/README.md) - Authentication system overview
- [App Authentication](./auth/app-authentication.md) - Main app authentication
- [Dashboard Authentication](./auth/dashboard-authentication.md) - Dashboard authentication

### Smart Contracts

- [Architecture Diagram](./contracts/contracts-architecture-diagram.md) - Visual contract architecture
- [Quick Reference](./contracts/contracts-quick-reference.md) - Quick contract reference
- [Technical Architecture](./contracts/contracts-technical-architecture.md) - Detailed technical specs

## 📖 Documentation Guidelines

### For Feature Specifications

When creating documentation for a new feature:

1. **Create a feature folder** under `docs/features/[feature-name]/`
2. **Include these documents:**
   - `functional-specification.md` - Business and technical requirements
   - `[feature-name]-api.md` - API documentation (if applicable)
   - `[feature-name]-integration.md` - Integration guide (if applicable)
3. **Reference platform standards** instead of duplicating them
4. **Keep feature-specific** - Only document what's unique to this feature

### Document Structure

Each feature specification should follow this structure:

1. **Executive Summary** - Purpose, scope, stakeholders
2. **Business Requirements** - Functional and non-functional requirements
3. **Technical Specifications** - API endpoints, data flow, architecture
4. **User Interface Specifications** - UI/UX design and flows
5. **Business Logic** - Calculations, rules, and algorithms
6. **Data Validation** - Input validation rules
7. **Feature-Specific Details** - Anything unique to this feature

**What NOT to include in feature specs:**

- Generic security standards (reference `platform/security.md` instead)
- Generic testing strategies (reference `platform/testing-strategy.md` instead)
- Generic deployment procedures (reference `platform/deployment.md` instead)
- Technology stack details (reference `platform/architecture.md` instead)
- Generic performance standards (reference `platform/performance.md` instead)

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  CNC Portal Platform                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Vue App   │  │Nuxt Dashboard│  │  Contract  │ │
│  │  (Frontend) │  │  (Frontend)  │  │ (Hardhat)  │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                 │                 │        │
│         └────────┬────────┘                 │        │
│                  │ REST/JWT                 │        │
│                  ▼                          │        │
│         ┌────────────────┐                  │        │
│         │  Express API   │                  │        │
│         │   (Backend)    │◄─────────────────┘        │
│         └────────┬───────┘      Web3                 │
│                  │                                    │
│                  ▼                                    │
│         ┌────────────────┐                           │
│         │   PostgreSQL   │                           │
│         │   (Database)   │                           │
│         └────────────────┘                           │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### For Developers

1. **Start with Platform Documentation:**
   - Read [Architecture](./platform/architecture.md) to understand the system
   - Review [Development Standards](./platform/development-standards.md) for code conventions
   - Check [Security](./platform/security.md) for security requirements

2. **Feature-Specific Work:**
   - Navigate to the relevant feature folder in `docs/features/`
   - Read the functional specification
   - Follow the integration guides

3. **Implementation:**
   - Follow the testing strategy in [Testing Strategy](./platform/testing-strategy.md)
   - Adhere to security standards in [Security](./platform/security.md)
   - Meet performance targets in [Performance](./platform/performance.md)

### For Product Managers

1. Review feature specifications in `docs/features/`
2. Check implementation status and roadmaps
3. Understand technical constraints in platform documentation

### For QA/Testing Teams

1. Review [Testing Strategy](./platform/testing-strategy.md) for overall approach
2. Check feature-specific test requirements in functional specifications
3. Follow testing guidelines in development standards

## 📝 Contributing to Documentation

### Adding New Feature Documentation

1. Create a new folder: `docs/features/[feature-name]/`
2. Create functional specification following the template
3. Add API documentation if the feature has endpoints
4. Add integration guide for frontend/backend integration
5. Update this README to include the new feature

### Updating Existing Documentation

1. Ensure changes are accurate and up-to-date
2. Update version numbers and dates
3. Add changelog entries
4. Review cross-references to other documents
5. Update the table of contents if structure changes

### Documentation Standards

- Use Markdown format
- Include table of contents for long documents
- Use code blocks with language specification
- Include diagrams where helpful (Mermaid, ASCII, or images)
- Keep language clear and concise
- Provide examples for complex concepts
- Link to related documentation

## 🔍 Search Tips

- Use your IDE's search function to find specific topics
- Check the feature folder for feature-specific documentation
- Platform-wide standards are in `platform/` directory
- Look for `README.md` files in each folder for navigation

## 📞 Support

For questions about documentation:

1. Check if the information exists in platform documentation
2. Review the specific feature documentation
3. Check related authentication or contract documentation
4. Create an issue if documentation is missing or unclear

## 📄 License

This documentation is part of the CNC Portal project.

---

**Last Updated:** December 7, 2025  
**Maintained by:** CNC Portal Development Team

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

- **Repository**: <https://github.com/globe-and-citizen/cnc-portal>
- **OpenZeppelin Docs**: <https://docs.openzeppelin.com/contracts>
- **Hardhat Docs**: <https://hardhat.org/docs>
- **EIP-712 Specification**: <https://eips.ethereum.org/EIPS/eip-712>
- **Beacon Proxy Pattern**: <https://docs.openzeppelin.com/contracts/api/proxy#beacon>

---

*Last Updated: November 23, 2024*  
*Maintained by: CNC Portal Team*
