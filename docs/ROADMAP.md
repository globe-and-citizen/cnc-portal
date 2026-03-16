# CNC Portal — Roadmap

**Version:** 1.0.0
**Last Updated:** March 16, 2026
**Status:** Active

---

## 1. Executive Summary

The CNC Portal is an open platform that enables any team — open-source community or traditional company — to operate as a Crypto Native Corporation (CNC): compensating contributors on-chain with wages, claims, and vesting, and governing transparently through proposals and Board of Directors elections.

**Current status:** 63% complete (26/41 features), actively in M5 — Analytics (Q1 2026).
**Target production date:** Q2 2026 (M8 deployment automation and monitoring), with full-scale launch in Q3 2026 (M9).

> ⚠️ **Mainnet is blocked** by 3 critical security findings from the March 4, 2026 audit. See [Section 5](#5-security-remediation-track) for the remediation checklist.

---

## 2. Milestone Overview

| # | Milestone | Status | Target | Complete |
|---|-----------|--------|--------|----------|
| M1 | Foundation | ✅ Complete | Q4 2024 | 100% |
| M2 | Compensation Primitives | ✅ Complete | Q4 2024 | 100% |
| M3 | Governance | ✅ Complete | Q4 2024 | 100% |
| M4 | Vesting | ✅ Complete | Q4 2024 | 100% |
| M5 | Analytics | 🔄 In Progress | Q1 2026 | 33% |
| M6 | Backoffice | 🔄 In Progress | Q1 2026 | 25% |
| M7 | Hardening | ⏳ Pending | Q2 2026 | 0% |
| M8 | Production | ⏳ Pending | Q2 2026 | 0% |
| M9 | Scale | ⏳ Pending | Q3 2026 | 0% |

---

## 3. Milestone Deep-Dives

> M1–M4 are fully complete and not detailed below. See [Implementation Status](./03_IMPLEMENTATION_STATUS.md) for a full feature-level breakdown.

---

### M5 — Analytics (Q1 2026, 33% done)

**Goal:** Surface real-time platform statistics and an admin activity dashboard.

| Feature | Status | Notes |
|---------|--------|-------|
| Platform Statistics API | ✅ Done | Real-time team & financial metrics |
| Admin Dashboard | 🔄 In Progress | Activity overview; **blocked on design review** |
| Activity Analysis | ⏳ Pending | Member contributions, engagement |
| Financial Reports | ⏳ Pending | Treasury, claims, expense summaries |
| Team Performance Metrics | ⏳ Pending | KPIs and trend analysis |

**Blockers:** Dashboard design review (target: Mar 20); expense UI specification (target: Mar 18).

---

### M6 — Backoffice (Q1 2026, 25% done)

**Goal:** Equip admins with feature flag controls, an admin console, and audit logging.

| Feature | Status | Notes |
|---------|--------|-------|
| Feature Flags | 🔄 In Progress | Backend complete; UI in progress |
| Admin Console | ⏳ Pending | System-wide administration |
| Audit Logging | ⏳ Pending | Track all user/admin actions |
| Team Onboarding Wizard | 📋 Planned V2 | Guided setup flow |

**Blockers:** Dashboard mockup approval (target: Mar 20); admin console design not finalized.

---

### M7 — Hardening (Q2 2026)

**Goal:** Bring all quality and security gates to production-ready levels.

| Area | Current | Target | Notes |
|------|---------|--------|-------|
| E2E test coverage | 60% | 80%+ | Core user journeys, critical flows |
| Frontend test coverage | 87% | 90% | App: 88%, Dashboard: 85% |
| Backend test coverage | 85% | 90% | Improving weekly |
| Security audit remediation | 0/11 resolved | All critical + high | 3 critical, 8 high findings |
| Performance optimization | 450ms p95 | ≤500ms | Already met; validate under load |

**Key activities:**
- Complete E2E suite expansion
- Remediate all critical and high security findings (see [Section 5](#5-security-remediation-track))
- Engage professional third-party audit firm (OpenZeppelin, Trail of Bits, or equivalent)
- Frontend and backend coverage to 90%
- Complete RBAC (member roles and permissions)
- Plan account abstraction integration for V2

---

### M8 — Production (Q2 2026)

**Goal:** Automate deployment and establish production observability.

| Feature | Notes |
|---------|-------|
| Deployment automation | CI/CD pipeline for mainnet releases |
| Monitoring & alerting infrastructure | Real-time dashboards, on-call alerting |
| Bug bounty program | Immunefi or HackerOne; launched after testnet review |
| Professional third-party audit | Completion gate before mainnet |

> **Gate:** M8 cannot close until all critical security findings are resolved and a professional audit passes.

---

### M9 — Scale (Q3 2026)

**Goal:** Grow infrastructure and unlock advanced governance capabilities.

| Feature | Notes |
|---------|-------|
| Growth infrastructure | Multi-CNC support, partner integrations |
| Advanced governance | Quadratic voting, vote delegation |
| Account abstraction V2 | Smart wallet integration (ERC-4337) |

---

## 4. Critical Blockers

The following items are currently blocking milestone progress. Each has a named owner and target resolution date.

| Blocker | Milestone Impact | Resolution Path | Target |
|---------|-----------------|-----------------|--------|
| Admin dashboard design review | M5, M6 analytics and backoffice | Design review meeting scheduled | Mar 20 |
| Dashboard mockups approval | M5, M6 analytics | Stakeholder review scheduled | Mar 20 |
| Expense UI specification | M5 financial management | Update DESIGN_SPEC.md | Mar 18 |
| Tie-breaking UI test scenarios | M5 governance | Add test cases to user stories | Mar 20 |
| Security audit findings (3 critical) | M7, M8 — blocks mainnet | Remediation work in M7; see Section 5 | Q2 2026 |

---

## 5. Security Remediation Track

The March 4, 2026 internal security audit identified 18 findings across 9 contracts. Remediation is a hard gate before mainnet deployment. See [`contract/SECURITY_AUDIT.md`](../contract/SECURITY_AUDIT.md) for the full report.

---

### 🔴 Do Not Deploy to Mainnet Until:

These 4 items correspond to the 3 critical findings plus 1 informational that materially affects deployability:

| # | Finding | Contract | Action Required |
|---|---------|----------|----------------|
| 1 | Weak randomness in voting tie resolution | `Voting.sol` | Replace `blockhash` with Chainlink VRF v2 (or remove random selection option entirely) |
| 2 | Unrestricted external call in BoardOfDirectors | `BoardOfDirectors.sol` | Add 48-hour timelock; add target whitelist; add emergency cancel |
| 3 | No signature expiration on wage claims | `CashRemunerationEIP712.sol` | Add `expiresAt` field (90-day max) to `WageClaim` struct and validate on withdrawal |
| 4 | Hardhat console import in production code | `CashRemunerationEIP712.sol` | Remove `import 'hardhat/console.sol'` before deployment |

---

### 🟠 Strongly Recommended Before M8 (High Severity):

| # | Finding | Action Required |
|---|---------|----------------|
| 5 | Dividend distribution DoS | Implement pull-based distribution pattern in `InvestorV1.sol` |
| 6 | Front-running vulnerability in voting | Implement commit-reveal scheme in `Voting.sol` / `Elections.sol` |
| 7 | Missing multi-sig / timelock on critical functions | Transfer ownership to 3-of-5 Gnosis Safe multi-sig |
| 8 | No quorum requirement on BOD elections | Add 50% minimum quorum to `Elections.sol` |
| 9 | No slippage protection by default | Require `minSherOut > 0` in `SafeDepositRouter.sol` |
| 10 | Storage collision risk in upgradeable contracts | Document storage layout; add OpenZeppelin Upgrade Plugin validation |
| 11 | Unchecked external call return values | Use `Address.sendValue` pattern in `Bank.sol` |

---

## 6. Key Metrics & Targets

| Metric | Current | Target | By |
|--------|---------|--------|----|
| Feature completion | 63% (26/41) | 100% | Q3 2026 |
| Smart contract test coverage | 98% | ≥95% | ✅ Done |
| Frontend test coverage | 87% | 90% | M7 |
| Backend test coverage | 85% | 90% | M7 |
| E2E test coverage | 60% | 80%+ | M7 |
| API p95 response time | 450ms | ≤500ms | ✅ Done |
| Critical security findings resolved | 0/3 | 3/3 | M7 |
| High security findings resolved | 0/8 | 8/8 | M7–M8 |
| Professional audit | Not started | Passed | M8 |
| Live CNCs on mainnet | 0 | ≥3 | M9 |

---

## 7. Related Documents

| Document | Purpose |
|----------|---------|
| [Implementation Status](./03_IMPLEMENTATION_STATUS.md) | Feature-level delivery tracking |
| [Project Charter](./01_PROJECT_CHARTER.md) | Vision, objectives, business rules |
| [Security Audit](../contract/SECURITY_AUDIT.md) | Full findings with remediation code samples |
| [Architecture Overview](./platform/architecture.md) | System components and tech stack |
| [Testing Strategy](./platform/testing-strategy.md) | Coverage targets and test standards |

---

**Last Updated:** March 16, 2026
**Maintainer:** Tech Lead + Product Team
**Next Review:** At M6 completion or when scope changes significantly
