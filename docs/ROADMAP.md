# CNC Portal — Roadmap

**Version:** 1.1.0
**Last Updated:** March 16, 2026
**Status:** Active

---

## 1. Executive Summary

The CNC Portal is an open platform that enables any team — open-source community or traditional company — to operate as a Crypto Native Corporation (CNC): compensating contributors on-chain with wages, claims, and vesting, and governing transparently through proposals and Board of Directors elections.

**Current status:** 70% complete (35/50 tracked features), actively in M5 — Analytics (Q1 2026).
**Target production date:** Q2 2026 (M8 deployment automation and monitoring), with full-scale launch in Q3 2026 (M9).

> ⚠️ **Mainnet is blocked** by 3 critical security findings from the March 4, 2026 audit. Security remediation is a hard gate before M8.

---

## 2. Milestone Overview

| #   | Milestone               | Status         | Target  | Complete |
| --- | ----------------------- | -------------- | ------- | -------- |
| M1  | Foundation              | ✅ Complete    | Q4 2024 | 100%     |
| M2  | Compensation Primitives | ✅ Complete    | Q4 2024 | 100%     |
| M3  | Governance              | ✅ Complete    | Q4 2024 | 100%     |
| M4  | Vesting                 | ✅ Complete    | Q4 2024 | 100%     |
| M5  | Analytics               | 🔄 In Progress | Q1 2026 | 33%      |
| M6  | Backoffice              | 🔄 In Progress | Q1 2026 | 25%      |
| M7  | Hardening & Safe        | ⏳ Pending     | Q2 2026 | 0%       |
| M8  | Production              | ⏳ Pending     | Q2 2026 | 0%       |
| M9  | Scale                   | ⏳ Pending     | Q3 2026 | 0%       |

---

## 4. Milestone Deep-Dives

> M1–M4 are fully complete. See [Implementation Status](./03_IMPLEMENTATION_STATUS.md) for the full feature-level breakdown.

---

### M5 — Analytics (Q1 2026, 33% done)

**Goal:** Surface real-time platform statistics and an admin activity dashboard.

| Feature                  | Status         | Notes                                           |
| ------------------------ | -------------- | ----------------------------------------------- |
| Platform Statistics API  | ✅ Done        | Real-time team & financial metrics              |
| Admin Dashboard          | 🔄 In Progress | Activity overview; **blocked on design review** |
| Activity Analysis        | ⏳ Pending     | Member contributions, engagement                |
| Financial Reports        | ⏳ Pending     | Treasury, claims, expense summaries             |
| Team Performance Metrics | ⏳ Pending     | KPIs and trend analysis                         |

**Blockers:** Dashboard design review (target: Mar 20); expense UI specification (target: Mar 18).

---

### M6 — Backoffice (Q1 2026, 25% done)

**Goal:** Equip admins with feature flag controls, an admin console, audit logging, and solid backend data foundations.

| Feature                        | Status         | Notes                                                       |
| ------------------------------ | -------------- | ----------------------------------------------------------- |
| Feature Flags                  | 🔄 In Progress | Backend complete; UI in progress                            |
| Admin Console                  | ⏳ Pending     | System-wide administration                                  |
| Audit Logging                  | ⏳ Pending     | Track all user/admin actions                                |
| Backend: Soft Delete & Archive | ⏳ Pending     | Preserve data integrity; support undo and history           |
| Backend: Structured Logging    | ⏳ Pending     | Consistent log format across all services for observability |
| Team Onboarding Wizard         | 📋 Planned V2  | Guided setup flow                                           |

**Blockers:** Dashboard mockup approval (target: Mar 20); admin console design not finalized.

---

### M7 — Hardening & Safe Integration (Q2 2026)

**Goal:** Reach production-grade quality, complete Safe wallet integration as the foundation for on-chain treasury and payroll, and resolve all security audit findings.

#### Quality & Testing

| Area                       | Current       | Target              | Notes                                |
| -------------------------- | ------------- | ------------------- | ------------------------------------ |
| E2E test coverage          | 60%           | 100%                | Full critical-flow coverage; no gaps |
| Frontend test coverage     | 87%           | 90%                 | App: 88%, Dashboard: 85%             |
| Backend test coverage      | 85%           | 90%                 | Improving weekly                     |
| Security audit remediation | 0/11 resolved | All critical + high | 3 critical, 8 high findings          |
| Performance optimization   | 450ms p95     | ≤500ms              | Already met; validate under load     |

#### Safe Wallet Integration

A key architectural goal of M7 is to move treasury and payroll operations onto [Safe (Gnosis Safe)](https://safe.global/) multi-sig contracts, replacing the current single-owner bank model.

| Feature                                 | Status     | Notes                                                                   |
| --------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| Bank account backed by Safe             | ⏳ Pending | Replace single-owner bank with Safe multi-sig                           |
| Payroll (wages & claims) backed by Safe | ⏳ Pending | Safe as the fund source for wage disbursements                          |
| Expense account backed by Safe          | ⏳ Pending | Expense approvals executed via Safe tx                                  |
| Deploy multiple Safe instances per team | ⏳ Pending | Each team can have dedicated Safes (e.g. ops, payroll, reserve)         |
| BOD integration with Safe               | ⏳ Pending | BOD members as Safe signers, or Safe as BOD executor — architecture TBD |
| Safe modules for extended functionality | ⏳ Pending | Custom modules for recurring payments, allowances, spending limits      |

> **Architecture note:** The BOD + Safe integration is the most open design question of M7. Two approaches under review: (a) BOD members are the Safe signers directly, or (b) the Safe is the execution target for approved BOD actions.

#### Engineering & Infra

| Task                                       | Status     | Notes                                                                                        |
| ------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------- |
| Test Hardhat Ignition modules              | ⏳ Pending | Validate deployment scripts before mainnet                                                   |
| Verify Frontend Proxy deployed correctly   | ⏳ Pending | Confirm proxy config in staging and production                                               |
| Permissioning system necessity review      | ⏳ Pending | Implementation looks solid; evaluate whether RBAC layer is needed given on-chain permissions |
| Complete RBAC (member roles & permissions) | ⏳ Pending | If permissioning review confirms necessity                                                   |
| Engage professional third-party audit firm | ⏳ Pending | OpenZeppelin, Trail of Bits, or equivalent                                                   |

**Key activities:**

- Remediate all critical and high-security findings
- Drive E2E suite to full critical-path coverage
- Implement Safe as the underlying multi-sig for bank/payroll/expense accounts
- Decide and implement BOD ↔ Safe architecture
- Frontend and backend coverage to 90%

---

### M8 — Production (Q2 2026)

**Goal:** Automate deployment and establish production observability.

| Feature                              | Notes                                                |
| ------------------------------------ | ---------------------------------------------------- |
| Deployment automation                | CI/CD pipeline for mainnet releases                  |
| Monitoring & alerting infrastructure | Real-time dashboards, on-call alerting               |
| Bug bounty program                   | Immunefi or HackerOne; launched after testnet review |
| Professional third-party audit       | Completion gate before mainnet                       |

> **Gate:** M8 cannot close until all critical security findings are resolved and a professional audit passes.

---

### M9 — Scale (Q3 2026)

**Goal:** Grow adoption infrastructure, unlock advanced governance, and deliver account abstraction for frictionless onboarding.

#### Team Documents

Each CNC team should be able to generate, customize, and publish founding documents. These form the legal and operational backbone of the corporation.

| Document                | Status     | Notes                                               |
| ----------------------- | ---------- | --------------------------------------------------- |
| Employee Contract       | ⏳ Pending | Per-member, tied to wage and vesting terms          |
| Team Charter            | ⏳ Pending | Purpose, governance rules, and operating principles |
| Token Policy            | ⏳ Pending | Minting, distribution, and vesting rules            |
| Dividend Policy         | ⏳ Pending | Investor dividend schedule and mechanics            |
| Custom Policy Documents | ⏳ Pending | Flexible template engine for any team policy        |

#### Governance & Voting

| Feature               | Status        | Notes                                                                                  |
| --------------------- | ------------- | -------------------------------------------------------------------------------------- |
| MACY governance model | ⏳ Pending    | Research and implement MACY (Majority Acceptance Committee Yield) governance framework |
| Quadratic voting      | 📋 Planned V2 | Weighted by token balance, square-root dampened                                        |
| Vote delegation       | 📋 Planned V2 | Delegate voting power to a representative                                              |

#### Onboarding & UX

| Feature                            | Status     | Notes                                                               |
| ---------------------------------- | ---------- | ------------------------------------------------------------------- |
| Account abstraction for onboarding | ⏳ Pending | ERC-4337 smart wallets to remove seed phrase friction for new users |
| Safe modules (advanced)            | ⏳ Pending | Spending limits, recurring payments, allowance modules              |
| Growth infrastructure              | ⏳ Pending | Multi-CNC support, partner integrations                             |

---

## 5. Critical Blockers

| Blocker                              | Milestone Impact        | Resolution Path                 | Target   |
| ------------------------------------ | ----------------------- | ------------------------------- | -------- |
| Admin dashboard design review        | M5, M6                  | Design review meeting scheduled | Mar 20   |
| Dashboard mockups approval           | M5, M6                  | Stakeholder review scheduled    | Mar 20   |
| Expense UI specification             | M5 financial            | Update DESIGN_SPEC.md           | Mar 18   |
| Tie-breaking UI test scenarios       | M5 governance           | Add test cases to user stories  | Mar 20   |
| BOD ↔ Safe architecture decision     | M7 Safe integration     | Architecture review needed      | Apr 2026 |
| Security audit findings (3 critical) | M7, M8 — blocks mainnet | Remediation work tracked in M7  | Q2 2026  |

---

## 6. Key Metrics & Targets

| Metric                       | Current             | Target                      | By      |
| ---------------------------- | ------------------- | --------------------------- | ------- |
| Feature completion           | 70% (35/50 tracked) | 100%                        | Q3 2026 |
| Smart contract test coverage | 98%                 | ≥95%                        | ✅ Done |
| Frontend test coverage       | 87%                 | 90%                         | M7      |
| Backend test coverage        | 85%                 | 90%                         | M7      |
| E2E test coverage            | 60%                 | 100%                        | M7      |
| API p95 response time        | 450ms               | ≤500ms                      | ✅ Done |
| Security audit               | In progress         | Resolved + 3rd-party passed | M8      |
| Live CNCs on mainnet         | 0                   | ≥3                          | M9      |

---

## 7. Related Documents

| Document                                               | Purpose                                     |
| ------------------------------------------------------ | ------------------------------------------- |
| [Implementation Status](./03_IMPLEMENTATION_STATUS.md) | Feature-level delivery tracking             |
| [Project Charter](./01_PROJECT_CHARTER.md)             | Vision, objectives, business rules          |
| [Security Audit](../contract/SECURITY_AUDIT.md)        | Full findings with remediation code samples |
| [Architecture Overview](./platform/architecture.md)    | System components and tech stack            |
| [Testing Strategy](./platform/testing-strategy.md)     | Coverage targets and test standards         |

---

**Last Updated:** March 16, 2026
**Maintainer:** Tech Lead + Product Team
**Next Review:** At M6 completion or when scope changes significantly
