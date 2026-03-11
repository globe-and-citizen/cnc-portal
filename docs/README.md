# CNC Portal Documentation

Welcome to the CNC Portal documentation. This directory contains comprehensive documentation for all aspects of the platform.

## 📑 Table of Contents

- [CNC Portal Documentation](#cnc-portal-documentation)
  - [📑 Table of Contents](#-table-of-contents)
  - [🚀 Quick Links](#-quick-links)
  - [📚 Documentation Structure](#-documentation-structure)
  - [🎯 Quick Navigation](#-quick-navigation)
    - [Platform Documentation](#platform-documentation)
    - [Feature Documentation](#feature-documentation)
    - [Authentication](#authentication)
    - [Smart Contracts](#smart-contracts)
  - [📖 Documentation Guidelines](#-documentation-guidelines)
    - [Creating Feature Specifications](#creating-feature-specifications)
    - [Document Structure](#document-structure)
  - [🏗️ Architecture Overview](#️-architecture-overview)
  - [🚀 Getting Started](#-getting-started)
    - [For Developers](#for-developers)
    - [For Product Managers](#for-product-managers)
    - [For QA/Testing Teams](#for-qatesting-teams)
  - [📝 Contributing to Documentation](#-contributing-to-documentation)
    - [Adding New Feature Documentation](#adding-new-feature-documentation)
    - [Updating Existing Documentation](#updating-existing-documentation)
    - [Documentation Standards](#documentation-standards)
  - [🔍 Search Tips](#-search-tips)
  - [📖 Glossary](#-glossary)
    - [Platform Terms](#platform-terms)
    - [Project-Specific Terms](#project-specific-terms)
  - [📞 Support](#-support)
  - [📄 License](#-license)

---

## 🚀 Quick Links

**New to the project?**

- 📖 [Getting Started](#-getting-started) - Start here
- 🏗️ [Architecture Overview](./platform/architecture.md) - Understand the system
- 🔐 [Authentication](./auth/README.md) - How users authenticate
- 📊 [Statistics Feature](./features/stats/functional-specification.md) - Example feature

**Writing Documentation?**

- ✍️ [Feature Specification Guide](./platform/feature-specification-guide.md) - **How to write specs**
- 📝 [Development Standards](./platform/development-standards.md) - Code quality standards
- 🧪 [Testing Strategy](./platform/testing-strategy.md) - How to test

**Deploying?**

- 🚀 [Deployment Guide](./platform/deployment.md) - Deploy all components
- 🔒 [Security Standards](./platform/security.md) - Security requirements
- ⚡ [Performance Standards](./platform/performance.md) - Performance targets

---

## 📚 Documentation Structure

```
docs/
├── README.md                           # This file - Documentation index
├── platform/                           # Platform-wide specifications
│   ├── architecture.md                # System architecture
│   ├── security.md                    # Security standards & requirements
│   ├── performance.md                 # Performance standards & optimization
│   ├── testing-strategy.md            # Testing standards & guidelines
│   ├── feature-specification-guide.md # How to write feature specs (NEW)
│   ├── deployment.md                  # Deployment procedures
│   └── development-standards.md       # Code quality & development standards
├── features/                          # Feature-specific documentation
│   ├── stats/                         # Statistics feature
│   │   ├── functional-specification.md
│   │   ├── stats-api.md
│   │   └── stats-dashboard-integration.md
│   ├── serverless-wake-up/           # Serverless wake-up feature
│   │   └── README.md
│   └── backoffice/                   # Backoffice admin feature
│       └── README.md
├── auth/                              # Authentication documentation
│   ├── README.md
│   ├── app-authentication.md
│   └── dashboard-authentication.md
└── contracts/                         # Smart contracts documentation
    ├── contracts-architecture-diagram.md
    ├── contracts-quick-reference.md
    └── contracts-technical-architecture.md
```

---

## 🎯 Quick Navigation

### Platform Documentation

**Core Platform:**

- [Architecture](./platform/architecture.md) - System architecture and component relationships
- [Security](./platform/security.md) - Security standards, authentication, authorization
- [Performance](./platform/performance.md) - Performance requirements and optimization
- [Testing Strategy](./platform/testing-strategy.md) - Testing standards for the entire platform
- [Deployment](./platform/deployment.md) - Deployment procedures and environment setup
- [Development Standards](./platform/development-standards.md) - Code quality and conventions
- [Feature Specification Guide](./platform/feature-specification-guide.md) - **How to write feature specs**

### Feature Documentation

**Statistics Feature:**

- [Functional Specification](./features/stats/functional-specification.md) - Complete feature specification
- [API Documentation](./features/stats/stats-api.md) - REST API reference
- [Dashboard Integration](./features/stats/stats-dashboard-integration.md) - Frontend integration guide

**Serverless Wake-up Feature:**

- [Feature Documentation](./features/serverless-wake-up/README.md) - Complete feature documentation and quick start

**Backoffice Feature:**

- [Feature Flags](./features/backoffice/feature-flags.md) - Feature flag system with API endpoints
- [Admin Panel Overview](./features/backoffice/README.md) - Backoffice management system

### Authentication

- [Authentication Overview](./auth/README.md) - Authentication system overview
- [App Authentication](./auth/app-authentication.md) - Main app authentication
- [Dashboard Authentication](./auth/dashboard-authentication.md) - Dashboard authentication

### Smart Contracts

- [Architecture Diagram](./contracts/contracts-architecture-diagram.md) - Visual contract architecture
- [Quick Reference](./contracts/contracts-quick-reference.md) - Quick contract reference
- [Technical Architecture](./contracts/contracts-technical-architecture.md) - Detailed technical specs

---

## 📖 Documentation Guidelines

### Creating Feature Specifications

**📋 Start Here:** [Feature Specification Guide](./platform/feature-specification-guide.md)

This comprehensive guide provides:

- Complete template for feature specifications
- What to include vs what to reference
- Good examples vs bad examples
- Quality checklist before submission
- Common mistakes to avoid

**Quick Summary:**

When creating documentation for a new feature:

1. **Read the guide first:** [Feature Specification Guide](./platform/feature-specification-guide.md)
2. **Create a feature folder** under `docs/features/[feature-name]/`
3. **Use the template** provided in the guide
4. **Reference platform standards** instead of duplicating them
5. **Keep it concise** - Target 400-700 lines
6. **Focus on feature-specific information** only

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

---

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

---

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

---

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

---

## 🔍 Search Tips

- Use your IDE's search function to find specific topics
- Check the feature folder for feature-specific documentation
- Platform-wide standards are in `platform/` directory
- Look for `README.md` files in each folder for navigation

---

## 📖 Glossary

### Platform Terms

**API (Application Programming Interface):** Set of rules and protocols for building and interacting with software applications.

**JWT (JSON Web Token):** Compact token format for securely transmitting information between parties as a JSON object.

**Prisma ORM:** Modern database toolkit for TypeScript and Node.js that provides type-safe database access.

**SSR (Server-Side Rendering):** Rendering web pages on the server before sending to client.

**OpenAPI/Swagger:** Specification for describing RESTful APIs in a machine-readable format.

**Rate Limiting:** Controlling the number of requests a user can make to prevent abuse.

**TypeScript:** Typed superset of JavaScript that compiles to plain JavaScript.

**Nuxt:** Vue.js framework for building server-side rendered and static web applications.

**Composable:** Reusable Vue 3 function that encapsulates logic and state management.

**Aggregation:** Process of collecting and summarizing data to produce useful statistics.

**Pagination:** Dividing large datasets into smaller pages for efficient loading and display.

### Project-Specific Terms

**Team:** Organization unit within CNC Portal where members collaborate.

**Claim:** Time or work entry submitted by a member for compensation.

**Wage:** Compensation structure defining payment rates and terms.

**Board Action:** Governance decision requiring approval or execution.

**Active Entity:** Entity (team, user, contract, etc.) that has activity within the selected period.

**Growth Metrics:** Percentage change comparing current period to previous period.

**Period:** Time range for filtering data (7 days, 30 days, 90 days, or all time).

---

## 📞 Support

For questions about documentation:

1. Check if the information exists in platform documentation
2. Review the specific feature documentation
3. Check related authentication or contract documentation
4. Create an issue if documentation is missing or unclear

## 📄 License

This documentation is part of the CNC Portal project.

---

**Last Updated:** December 16, 2025
