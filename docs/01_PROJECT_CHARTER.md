# CNC Portal - Project Charter

**Version:** 1.0.0  
**Date:** March 11, 2026  
**Status:** Draft  
**Document Owner:** Product Team

---

## 1. Executive Summary

### 1.1 Purpose

The CNC Portal exists to enable financial recognition of contributions and to provide structured governance tooling for any team or organization — from open-source communities to traditional companies seeking to adopt blockchain-based operations. It bridges on-chain smart contract execution with a familiar web interface, lowering the barrier for teams to compensate contributors fairly, govern transparently, and benefit from the trust, auditability, and automation that blockchain infrastructure provides.

### 1.2 Background / Problem Statement

Contributions — whether in open-source communities or inside traditional companies — are often poorly tracked, inconsistently rewarded, and governed through opaque, manual processes. At the same time, many organizations want the benefits of blockchain (transparency, auditability, trustless execution, borderless payments) but lack an accessible entry point.

The CNC Portal addresses both problems by providing:

- On-chain wage, claim, and vesting mechanisms backed by auditable smart contracts — usable by any team, not just crypto-native ones.
- An off-chain backend for coordination, user management, and analytics that integrates with familiar workflows.
- A self-service frontend and admin dashboard designed for teams of any size, from small open-source projects to established companies onboarding to Web3.

### 1.3 Charter Scope

✅ **In Scope**

| Component    | Description                                                                               |
| ------------ | ----------------------------------------------------------------------------------------- |
| `app/`       | Vue.js user-facing application — team, contract, governance, vesting, and token workflows |
| `dashboard/` | Nuxt admin dashboard — activity analytics, member management, back-office operations       |
| `backend/`   | Express.js REST API — authentication (SIWE/JWT), user data, platform statistics           |
| `contract/`  | Hardhat smart contracts — wages, claims, expenses, vesting, proposals, board actions      |
| `the-graph/` | Subgraph indexing for on-chain event consumption                                          |

✅ **Out of Scope**

- Non-Ethereum EVM-incompatible chains (not planned in the current roadmap).
- Off-platform treasury management tools (third-party integrations deferred).
- Full production SLA / uptime guarantees (infrastructure contracting handled separately).

---

## 2. Vision, Mission, and Objectives

### 2.1 Vision

A world where any team — open-source community or traditional company — can operate as a Crypto Native Corporation (CNC) on-chain with the same transparency, fairness, and automation that blockchain infrastructure makes possible, without requiring deep Web3 expertise to get started. The CNC Portal is the "GitHub for blockchain companies."

### 2.2 Mission

Deliver an intuitive and secure CNC Portal that makes spinning up and running a Crypto Native Corporation as seamless as creating a GitHub repository. Empower any team — open-source or traditional — to govern their operations transparently and compensate contributors fairly using blockchain technology.

### 2.3 Strategic Objectives

1. **Financial inclusion** — Provide wage, claim, expense, and vesting primitives on-chain so any contributor or employee can receive payment in a trustless, borderless manner.
2. **Blockchain onboarding** — Give traditional companies a practical, low-friction path to adopt on-chain operations and benefit from auditability, automation, and trustless execution.
3. **Governance accessibility** — Enable teams to submit, vote on, and execute proposals with minimal technical overhead, regardless of their Web3 experience level.
4. **Operational transparency** — Surface real-time analytics and activity statistics through the admin dashboard and platform stats API.
5. **Community and contribution** — Build supporting infrastructure (onboarding programs, grants, developer advocacy) to attract and retain contributors and partners.
6. **Developer experience** — Maintain a high-quality, well-tested codebase that contributors and integrators can rely on.
7. **Security first** — Adhere to security-by-default principles documented in [platform security standards](./platform/security.md).

---

## 3. Success Criteria

### 3.1 Business Outcomes

| Outcome                  | Criteria                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Contributor compensation | A team can create, approve, and execute a wage or claim end-to-end without off-platform tools |
| Governance workflow      | A proposal can be created, voted on, and executed fully on-chain via the UI                   |
| Analytics availability   | Platform statistics are available in real time for any active team                            |

### 3.2 SMART Objectives Breakdown

#### S — Specific

- Deploy a functional CNC Portal with 6 core modules (Auth, Teams, Payroll, Governance, Tokens, Analytics)
- Support multi-currency wages (Native token, USDC, custom tokens like SHER)
- Enable BOD elections with automatic tie-breaking
- Provide real-time analytics API and admin dashboard

#### M — Measurable

- 90%+ line coverage for frontend and backend unit tests
- 95%+ line coverage for smart contracts
- ≤500ms API response time (p95)
- Zero high/critical security findings at release
- Support ≥3 live CNCs executing claims, governance, and token operations

#### A — Achievable

- Leverage existing boilerplate (Vite, Pinia, Express, Prisma, Hardhat)
- Incremental delivery in 9 phases (M1–M9)
- Team of experienced blockchain developers
- Clear architecture and standards documented

#### R — Relevant

- Addresses critical need: transparent, trustless compensation for distributed teams
- Enables non-crypto-native companies to adopt blockchain operations
- Aligns with Globe & Citizen mission: governance and financial inclusion
- Supports multiple use cases: open-source, DAOs, startups, traditional companies

#### T — Time-bound

- M1–M4 Foundation & Core Features: Q4 2024 (Completed)
- M5–M6 Analytics & Backoffice: Q1 2026 (In Progress)
- M7–M8 Hardening & Production: Q2 2026 (Planned)
- Public launch target: Q2 2026

### 3.3 Technical Outcomes

| Outcome                        | Target                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Unit / component test coverage | ≥ 90% line coverage (app, backend)                                                                  |
| Smart contract test coverage   | ≥ 95% line coverage — see [testing strategy](./platform/testing-strategy.md)                        |
| API response time (p95)        | ≤ 500 ms — see [performance standards](./platform/performance.md)                                   |
| CI pipeline                    | All PRs pass lint, type-check, unit tests, and contract tests before merge                          |
| Security                       | No high/critical findings outstanding at release — see [security standards](./platform/security.md) |

### 3.4 KPIs / Targets (Phase 1)

- **User adoption:** At least 3 operational CNCs running through the portal with live teams.
- **Backend API:** Stable with ≥ 163 passing tests.
- **Smart contracts:** Stable with ≥ 350 passing tests.
- **Security:** Zero open high-severity security issues at release.
- **Test coverage:** Unit/component tests ≥ 90% line coverage (app, backend); smart contracts ≥ 95%.
- **Community:** Active contributor base with documented onboarding program.

---

## 4. Business Rules & Operational Constraints

### 4.1 Financial Management Rules

**Payroll & Wages**

- Each member can have wage rates defined in multiple currencies (Native token, USDC, SHER)
- Maximum hours per week set by admin for each member
- All claims must be submitted within 7 days of work period
- No claim can contain more than 24 hours in a single submission
- Multiple claims in a day are rate-limited to prevent abuse
- Claims must be approved by admin before payment
- Payments are finalized on-chain and immutable

**Expenses**

- Expense limits are configurable: no limit, max per transaction, max total, or max count
- All limits are enforced on-chain
- Expense validation occurs before submission
- Rejections return the expense to draft state for member editing
- All reimbursements are final on-chain transactions

### 4.2 Governance Rules

**Proposals**

- Only team members can create proposals
- Voting period must be 7, 14, or 30 days
- Simple majority rule: > 50% votes required to pass
- Abstentions do not count toward pass/fail
- Proposals auto-execute if marked for execution-on-approval
- Members cannot change their vote after casting

**Board of Directors Elections**

- Each member gets one vote per election
- Member can vote for up to N candidates (where N = number of seats)
- Top N vote-getters become board members
- Ties for final seat trigger tie-breaking mechanism
- BOD roles are updated on-chain immediately after election ends
- Previous BOD is replaced entirely (not incremental)

**Tie-Breaking**

- Detected automatically if multiple candidates have equal votes for final seat(s)
- Three mechanisms available (team configurable):
  1. **Admin Override:** Team owner casts deciding vote
  2. **Seniority:** Longest-tenured team member wins tie
  3. **Secondary Vote:** Only tied candidates voted again by all members

### 4.3 Team Management Rules

**Team Ownership**

- Team creator is automatically the owner/admin
- Owners cannot be removed unless promoted to another admin first
- Only owners can change team settings (name, description, contract)
- Members can leave team unless they are the sole owner

**Member Roles**

- **Member:** Can participate in work, claim wages, vote on proposals
- **Admin:** Can manage members, create proposals, approve claims, set wages

**Invitations**

- Invitations are one-time use and expire after 7 days
- Invited users must accept to join the team (auto-join not allowed)
- Cannot invite non-existent users
- Duplicate invitations are rejected

### 4.4 Security & Compliance Rules

**Access Control**

- All API endpoints require authentication (JWT or wallet signature)
- Users can only access teams they are members of
- Admins can access all team data; members can only view their own
- Contract interactions require wallet signature

**Data Integrity**

- All financial transactions must be signed on-chain
- Cannot modify historical claims, expenses, or votes
- Audit log must record all admin actions
- All currency conversions must use live price feeds

**Blockchain Interactions**

- Smart contracts must be upgradeable (proxy pattern)
- Contract state must remain consistent with off-chain database
- Failed transactions must be retried with exponential backoff
- Gas prices are monitored and transaction batching enabled

---

## 5. Stakeholders and Governance

### 4.1 Sponsors / Owners

| Role                     | Responsibility                                                 |
| ------------------------ | -------------------------------------------------------------- |
| Product Team             | Charter ownership, feature prioritization, acceptance criteria |
| Engineering Team         | Architecture decisions, implementation, code quality standards |
| Community / Contributors | Feature feedback, open-source contributions, issue reporting   |

### 4.2 Decision-Making Model

- **Product roadmap** decisions are owned by the Product Team and reflect community input via GitHub Issues.
- **Technical architecture** decisions follow the standards in [architecture.md](./platform/architecture.md); significant changes require a design document under `docs/platform/`.
- **Breaking changes** to smart contracts require a security review and explicit versioning.
- **Documentation** changes follow the guidelines in [feature-specification-guide.md](./platform/feature-specification-guide.md).

### 4.3 Roles and Responsibilities

Each team member has ownership of best practices, learning, and continuous improvement in their domain:

| Role                    | Responsibilities                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product Owner           | Maintain backlog, define acceptance criteria, approve charter revisions, coordinate with Globe & Citizen sponsors                                                              |
| Tech Lead               | Own architecture consistency, review significant PRs, maintain platform docs                                                                                                   |
| Frontend Engineer       | Vue.js best practices (Composition API, components, validation), design/Tailwind/DaisyUI consistency, component test coverage, accessibility standards                         |
| Smart Contract Engineer | Solidity best practices (security, performance, gas optimization), comprehensive contract testing, audit readiness, contract documentation                                     |
| Backend Engineer        | Express best practices (security, perf), Prisma schema design, API design and best practices (auth, error handling, pagination, sorting, search), backend testing and coverage |
| Web3 Integration Lead   | Web3 integration in frontend, best practices for wallet connection and contract interaction, E2E testing for Web3 flows, TypeScript type safety in Web3 code                   |
| QA / Testing            | Validate coverage targets, run E2E suite, maintain [testing strategy](./platform/testing-strategy.md), test case documentation                                                 |
| DevOps / Infrastructure | Docker Compose configuration, CI/CD pipelines (lint, type-check, test, build), deployment automation, environment management                                                   |

---

## 6. Scope and Deliverables

### 6.1 Core Features

✅ **Authentication & User Management**

- SIWE (Sign-In with Ethereum) — blockchain-native identity
- JWT-based backend authentication
- Wallet connection (MetaMask, WalletConnect, account abstraction ready)

✅ **Team & Organization Management**

- **CNC creation wizard** — frictionless onboarding to spin up a blockchain company
- **Team member management** — add/remove members, role assignment
- **User discovery** — find and recruit contributors or employees
- **Invitations** — send and accept team join invitations
- **Freelancer and team profiles** — portfolio and team reputation visibility

✅ **Financial Management**

- **Account Management:** Bank accounts, expense accounts with configurable limits
- **Payroll & Cash Remuneration:**
  - Multi-currency wage support (Native token, USDC, custom tokens like SHER)
  - Flexible wage configuration per team member
  - Claims submission with time validation (max 24 hours per submit, rate limiting to prevent bulk abuse)
  - Weekly claim limits and approval workflows
  - Member withdrawals after claim approval
- **Expenses:** Configurable limits (no limit, max transaction count, max total amount, max per transaction)
- **Treasury:** Crypto-based funding, deposits, withdrawals, balance tracking

✅ **Governance**

- **Proposals:** creation, discussion, voting, on-chain execution
- **Voting mechanisms:** simple majority, weighted voting, tie-breaking logic
- **Board of Directors (BOD) election:** multi-candidate, multi-seat elections with tie-breaking and state management
- **Vote tracking** across elections and proposals

✅ **Token & Vesting Management**

- Token minting and distribution to team members
- Configurable vesting schedules (cliff, release periods)
- Token-based governance and holder rights

✅ **Analytics & Operations**

- **Platform Statistics API** — real-time activity and financial metrics
- **Activity Dashboards:** team overview, member views, financial tracking, cash remuneration stats
- **Admin Dashboard:** member management, feature flags, backoffice operations

### 6.2 In-Scope Deliverables

✅ **Smart Contracts**

- Payroll, Expenses, Vesting, Proposals, Board Actions contracts
- Upgradeable Beacon architecture
- Comprehensive TypeScript test suite (≥ 350 tests)
- Deployment scripts for Hardhat Ignition (local, testnet, mainnet)

✅ **Backend API**

- SIWE / JWT authentication
- Team, user, and contribution management endpoints
- Platform statistics API (see [stats functional specification](./features/stats/functional-specification.md))
- Prisma ORM schema with PostgreSQL

✅ **Vue Frontend (`app/`)**

- Team creation and management
- Contract interaction (wages, claims, vesting, proposals)
- Web3 wallet integration (wagmi)
- Component test coverage ≥ 90%

✅ **Nuxt Dashboard (`dashboard/`)**

- Activity analytics and member management
- Backoffice feature flags and admin tooling
- Stats dashboard integration (see [stats dashboard integration](./features/stats/stats-dashboard-integration.md))

✅ **Infrastructure**

- Docker Compose for full-stack local development
- CI pipelines (lint, type-check, test, build) for all components
- Deployment guides — see [deployment documentation](./platform/deployment.md)

### 5.2 Out of Scope

- Mobile applications (React Native / Flutter)
- Non-EVM blockchain integrations
- Third-party payroll integrations
- Dedicated SLA / uptime contractual guarantees (infra hosting handled separately)

---

## 7. Architecture and Platform Alignment

This charter defers all architectural detail to the dedicated platform documentation. The following standards apply to all work on the CNC Portal:

| Standard               | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| System architecture    | [Architecture Overview](./platform/architecture.md)                      |
| Security requirements  | [Security Standards](./platform/security.md)                             |
| Testing strategy       | [Testing Strategy](./platform/testing-strategy.md)                       |
| Performance targets    | [Performance Standards](./platform/performance.md)                       |
| Deployment procedures  | [Deployment Guide](./platform/deployment.md)                             |
| Development standards  | [Development Standards](./platform/development-standards.md)             |
| Feature spec authoring | [Feature Specification Guide](./platform/feature-specification-guide.md) |

**Tech Stack Summary (reference only):**

- Frontend: Vue 3 + TypeScript + Vite + Pinia + wagmi
- Dashboard: Nuxt 3 + TypeScript + Nuxt UI
- Backend: Express.js + TypeScript + Prisma + PostgreSQL
- Contracts: Solidity + Hardhat + TypeScript tests
- Indexing: The Graph Protocol

---

## 8. Constraints, Assumptions, and Risks

### 8.1 Constraints

- All contributions must pass CI (lint, type-check, unit tests, contract tests) before merge.
- Smart contract changes require explicit versioning and security review.
- Environment variables required for deployment must be documented in component `README` files; secrets must never be committed.
- The project targets Node.js v22.18.0+.

### 8.2 Assumptions

- Contributors are familiar with Web3 concepts (wallets, signing, on-chain transactions).
- Teams operate on EVM-compatible networks supported by the platform.
- PostgreSQL is available as the primary data store.
- The Graph or an equivalent indexing solution is available for on-chain event queries.

### 8.3 Risks

| Risk                                | Likelihood | Impact | Mitigation                                                                      |
| ----------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------- |
| Smart contract vulnerability        | Medium     | High   | Comprehensive test suite (≥ 95% coverage); planned security audit               |
| Web3 wallet / chain incompatibility | Medium     | Medium | Wagmi abstraction layer; network configuration in `app/src/networks/`           |
| Backend API availability            | Low        | High   | Docker Compose for local env; deployment guide for production                   |
| Contributor onboarding friction     | Medium     | Medium | Maintained docs, CONTRIBUTION.md, copilot-instructions for AI-assisted dev      |
| Breaking Solidity upgrades          | Low        | High   | Upgradeable contract architecture; pinned compiler version in hardhat.config.ts |

---

## 9. Milestones and Timeline

> Milestones reflect platform capability phases, not calendar targets. Calendar scheduling is tracked in the project backlog.

| Milestone                    | Description                                                                                                                                 | Status      | Target  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------- |
| M1 — Foundation              | Core architecture, auth (SIWE/JWT), team management, basic contract deployment                                                              | Implemented | Q4 2024 |
| M2 — Compensation Primitives | Wages, Claims, Expenses contracts + frontend flows, Multi-currency support (Native token, USDC, SHER)                                       | Implemented | Q4 2024 |
| M3 — Governance              | Proposals, Board Actions, on-chain voting + UI, Tie-breaking mechanisms                                                                     | Implemented | Q4 2024 |
| M4 — Vesting                 | On-chain vesting schedules + dashboard integration                                                                                          | Implemented | Q4 2024 |
| M5 — Analytics               | Platform statistics API + dashboard analytics, Real-time activity views                                                                     | In Progress | Q1 2026 |
| M6 — Backoffice              | Admin panel, feature flags, backoffice management, Onboarding program documentation                                                         | In Progress | Q1 2026 |
| M7 — Community & Growth      | Grants program exploration, Developer onboarding program, Documentation and training materials, Marketing and community engagement strategy | Draft       | Q2 2026 |
| M8 — Hardening               | E2E test suite completion, security audit, performance benchmarking, production readiness assessment                                        | Draft       | Q2 2026 |
| M9 — Production & Scale      | Deployment automation, monitoring and alerting, Release pipeline, Support infrastructure for live CNCs                                      | Draft       | Q3 2026 |

---

## 10. Product Strategy: Community, Growth, and Sustainability

Beyond execution on core features, the CNC Portal requires deliberate investment in three key areas:

### 10.1 Developer & Community Onboarding

- **Onboarding Program:** Create structured onboarding checklists and training for new developers (Web3, blockchain dev experience level varies widely).
- **Documentation:** Maintain comprehensive guides in `docs/copilot-instructions/` and `CONTRIBUTION.md` for easy contributor integration.
- **Mentorship:** Pair senior developers with junior contributors to accelerate learning and responsibility ownership.

## 11. Change Control and Review Cadence

- **Charter reviews** are conducted at the start of each milestone and whenever scope changes significantly.
- **Charter amendments** require approval from the Document Owner (Product Team) and acknowledgment from the Tech Lead.
- **Version increments:** Minor changes (typos, clarifications) increment the patch version (e.g., 1.0.1). Scope or objective changes increment the minor version (e.g., 1.1.0). Structural re-scoping increments the major version (e.g., 2.0.0).
- All changes must be committed via standard PR process with a description of what changed and why.

---

## 12. Related Documentation

| Document                    | Location                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| Architecture Overview       | [docs/platform/architecture.md](./platform/architecture.md)                                           |
| Security Standards          | [docs/platform/security.md](./platform/security.md)                                                   |
| Testing Strategy            | [docs/platform/testing-strategy.md](./platform/testing-strategy.md)                                   |
| Performance Standards       | [docs/platform/performance.md](./platform/performance.md)                                             |
| Deployment Guide            | [docs/platform/deployment.md](./platform/deployment.md)                                               |
| Development Standards       | [docs/platform/development-standards.md](./platform/development-standards.md)                         |
| Feature Specification Guide | [docs/platform/feature-specification-guide.md](./platform/feature-specification-guide.md)             |
| Stats Feature Spec          | [docs/features/stats/functional-specification.md](./features/stats/functional-specification.md)       |
| Stats API Reference         | [docs/features/stats/stats-api.md](./features/stats/stats-api.md)                                     |
| Contract Architecture       | [docs/contracts/contracts-technical-architecture.md](./contracts/contracts-technical-architecture.md) |
| Auth Overview               | [docs/auth/README.md](./auth/README.md)                                                               |
| CHANGELOG                   | [CHANGELOG.md](../CHANGELOG.md)                                                                       |
| Contribution Guide          | [CONTRIBUTION.md](../CONTRIBUTION.md)                                                                 |

---

**Last Updated:** March 11, 2026  
**Document Owner:** Product Team  
**Next Review:** At Milestone 6 completion or on significant scope change
