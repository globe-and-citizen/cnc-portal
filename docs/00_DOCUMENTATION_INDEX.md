# CNC Portal Documentation Index

**Quick Navigation for CNC Portal Documentation**

Welcome! This index helps you navigate the comprehensive documentation for the CNC Portal project. Read the documents in the suggested order to build a complete understanding of the project.

---

## 📖 Recommended Reading Order

### For New Team Members

Start here to get oriented:

1. **[Project Charter](./01_PROJECT_CHARTER.md)** — Vision, scope, objectives, and governance (30 min)
2. **[Architecture Overview](./platform/architecture.md)** — System components and relationships (20 min)
3. **[User Stories](./02_USER_STORIES.md)** — Feature intent and acceptance criteria (45 min)
4. **[Implementation Status](./03_IMPLEMENTATION_STATUS.md)** — What's done, in progress, and planned (15 min)

### For Product Managers

Understand the product direction:

1. [Project Charter](./01_PROJECT_CHARTER.md) — Business objectives and success criteria
2. [User Stories](./02_USER_STORIES.md) — Feature definitions and priorities
3. [Implementation Status](./03_IMPLEMENTATION_STATUS.md) — Delivery tracking and roadmap

### For Backend/API Developers

Implement backend functionality:

1. [Architecture Overview](./platform/architecture.md) — System design
2. [User Stories](./02_USER_STORIES.md) — Feature requirements
3. [API Specifications](./platform/development-standards.md) — Coding standards
4. [Testing Strategy](./platform/testing-strategy.md) — Test requirements

### For Frontend/Vue Developers

Build the UI:

1. [Architecture Overview](./platform/architecture.md) — System design
2. [User Stories](./02_USER_STORIES.md) — Feature flows and requirements
3. [Vue Component Standards](../.github/copilot-instructions/vue-component-standards.md) — Component best practices
4. [Testing Strategy](./platform/testing-strategy.md) — Component testing requirements

### For Smart Contract Engineers

Implement on-chain logic:

1. [Project Charter](./01_PROJECT_CHARTER.md) — Business objectives
2. [User Stories](./02_USER_STORIES.md) — On-chain requirements
3. [Smart Contract Architecture](./contracts/contracts-technical-architecture.md) — Contract design
4. [Testing Strategy](./platform/testing-strategy.md) — Contract testing approach

---

## 📚 Core Documentation Map

### Governance & Planning

- [Project Charter](./01_PROJECT_CHARTER.md) — Vision, scope, milestones, stakeholder roles (v1.0.0)
- [User Stories](./02_USER_STORIES.md) — Feature definitions with acceptance criteria and priorities
- [Implementation Status](./03_IMPLEMENTATION_STATUS.md) — Feature delivery tracking and roadmap

### Architecture & Design

- [System Architecture](./platform/architecture.md) — Tech stack, component relationships, system diagram
- [Smart Contract Architecture](./contracts/contracts-technical-architecture.md) — On-chain design and patterns
- [Development Standards](./platform/development-standards.md) — Code quality and conventions

### Implementation Guides

- [Testing Strategy](./platform/testing-strategy.md) — Unit, component, integration, and E2E testing standards
- [Security Standards](./platform/security.md) — Security requirements and best practices
- [Performance Standards](./platform/performance.md) — Performance targets and optimization
- [Deployment Guide](./platform/deployment.md) — Environment setup and deployment procedures

### Feature Documentation

- [Authentication](./auth/README.md) — SIWE, JWT, user management
- [Statistics Feature](./features/stats/functional-specification.md) — Platform analytics implementation
- [API Reference](./features/stats/stats-api.md) — Statistics API endpoints

### Developer Support

- [Feature Specification Guide](./platform/feature-specification-guide.md) — How to write feature specs
- [Vue Component Standards](../.github/copilot-instructions/vue-component-standards.md) — Vue best practices
- [Web3 Integration Guide](../.github/copilot-instructions/web3-integration.md) — Wallet and contract interaction
- [Commit Conventions](../.github/copilot-instructions/commit-conventions.md) — Git workflow standards

---

## 🎯 Documentation by Purpose

### Want to understand the product?

→ Read: [Project Charter](./01_PROJECT_CHARTER.md) + [User Stories](./02_USER_STORIES.md)

### Want to implement a feature?

→ Read: [User Stories](./02_USER_STORIES.md) + [Architecture Overview](./platform/architecture.md) + [Testing Strategy](./platform/testing-strategy.md)

### Want to know what's being built when?

→ Read: [Implementation Status](./03_IMPLEMENTATION_STATUS.md) + [Project Charter Milestones](./01_PROJECT_CHARTER.md#8-milestones-and-timeline)

### Want to set up the project locally?

→ Read: [README.md](../README.md) + [Deployment Guide](./platform/deployment.md)

### Want to understand security & performance?

→ Read: [Security Standards](./platform/security.md) + [Performance Standards](./platform/performance.md)

### Want to contribute code?

→ Read: [Development Standards](./platform/development-standards.md) + [Testing Strategy](./platform/testing-strategy.md) + [CONTRIBUTION.md](../CONTRIBUTION.md)

---

## 📊 Documentation Status

| Document                                            | Version | Updated          | Status |
| --------------------------------------------------- | ------- | ---------------- | ------ |
| [Project Charter](./01_PROJECT_CHARTER.md)             | 1.0.0   | March 11, 2026   | Active |
| [User Stories](./02_USER_STORIES.md)                   | 1.0.0   | March 12, 2026   | Active |
| [Implementation Status](./03_IMPLEMENTATION_STATUS.md) | 1.0.0   | March 12, 2026   | Active |
| [Architecture Overview](./platform/architecture.md) | 1.0.0   | December 7, 2025 | Active |
| [Testing Strategy](./platform/testing-strategy.md)  | 1.0.0   | December 7, 2025 | Active |
| [Security Standards](./platform/security.md)        | 1.0.0   | TBD              | Draft  |
| [Performance Standards](./platform/performance.md)  | 1.0.0   | TBD              | Draft  |
| [Deployment Guide](./platform/deployment.md)        | 1.0.0   | TBD              | Draft  |

---

## 🔍 Quick Search by Topic

**Authentication & Users:**

- [Auth Overview](./auth/README.md) — SIWE, JWT, user management
- [App Authentication](./auth/app-authentication.md) — Vue app auth flow
- [Dashboard Authentication](./auth/dashboard-authentication.md) — Nuxt dashboard auth

**Financial Features (Wages, Claims, Expenses, Vesting):**

- [Project Charter § 5.1](./01_PROJECT_CHARTER.md#51-core-features) — Feature overview
- [User Stories: Payroll & Claims](./02_USER_STORIES.md#payroll--cash-remuneration) — Requirements
- [Implementation Status: Financial](./03_IMPLEMENTATION_STATUS.md#financial-management) — What's built

**Governance (Proposals, BOD Elections, Voting):**

- [Project Charter § 5.1](./01_PROJECT_CHARTER.md#51-core-features) — Feature overview
- [User Stories: Governance](./02_USER_STORIES.md#governance) — Requirements
- [Implementation Status: Governance](./03_IMPLEMENTATION_STATUS.md#governance) — What's built

**Web3 Integration & Smart Contracts:**

- [Smart Contract Architecture](./contracts/contracts-technical-architecture.md) — Contract design
- [Web3 Integration Guide](../.github/copilot-instructions/web3-integration.md) — Frontend integration
- [Testing Web3](../.github/copilot-instructions/testing-web3.md) — Web3 testing patterns

**Analytics & Dashboard:**

- [Stats Feature Spec](./features/stats/functional-specification.md) — Requirements
- [Stats API Reference](./features/stats/stats-api.md) — Endpoints
- [Stats Dashboard Integration](./features/stats/stats-dashboard-integration.md) — Frontend setup

---

## 💬 Getting Help

**Questions about the project direction?**

- See: [Project Charter](./01_PROJECT_CHARTER.md) | Section: [Stakeholders & Governance](./01_PROJECT_CHARTER.md#4-stakeholders-and-governance)

**Questions about feature requirements?**

- See: [User Stories](./02_USER_STORIES.md) — Use CTRL+F to search for your feature

**Questions about implementation status?**

- See: [Implementation Status](./03_IMPLEMENTATION_STATUS.md) — Track progress by module

**Questions about coding standards?**

- See: Feature-specific guides in [copilot-instructions/](../.github/copilot-instructions/)

**Questions about deployment?**

- See: [Deployment Guide](./platform/deployment.md) + [README.md](../README.md)

**Need to report an issue?**

- See: [CONTRIBUTION.md](../CONTRIBUTION.md)

---

## 📝 Last Updated

**Documentation Hub:** March 12, 2026  
**Next Review:** At Milestone 6 completion or when scope changes significantly

For updates to this index, see [00_DOCUMENTATION_INDEX.md](./00_DOCUMENTATION_INDEX.md) on GitHub.
