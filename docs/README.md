# CNC Portal Documentation

This hub routes readers to the current owner of each kind of CNC Portal documentation. Feature
behaviour belongs with its feature, platform rules belong in platform guides, and code and tests
remain executable evidence.

## Start Here

1. [Project Charter](./01_PROJECT_CHARTER.md) — product vision, scope, and governance.
2. [Architecture Overview](./platform/architecture.md) — system boundaries and components.
3. [Feature User Stories Index](./02_USER_STORIES.md) — canonical feature journeys and acceptance
   criteria.
4. [Feature Documentation Guide](./platform/feature-specification-guide.md) — authoring and human
   review contract.
5. [Contribution Guide](../CONTRIBUTION.md) — repository workflow and validation.

The [Implementation Status](./03_IMPLEMENTATION_STATUS.md) and [Roadmap](./ROADMAP.md) are dated
planning snapshots. Verify current delivery in the relevant feature README, code, tests, and GitHub
state before relying on a status claim.

## Documentation Ownership

| Question                                        | Source of truth                                      |
| ----------------------------------------------- | ---------------------------------------------------- |
| Why does CNC Portal exist?                      | [Project Charter](./01_PROJECT_CHARTER.md)           |
| What should a user be able to do?               | `docs/features/<feature>/README.md`                  |
| Has that behaviour passed human review?         | Feature acceptance criteria and validation statement |
| How does a smart contract behave?               | [Contract Features](./features/contracts/README.md)  |
| How should platform code be written and tested? | Platform and repository implementation guides        |
| Where is the executable evidence?               | Current code and tests                               |
| Why or when was a change delivered?             | GitHub issues, pull requests, ADRs, and Git          |

## Feature Documentation

### User-Story Features

| Feature                                                                      | Journey                                                   | Model state             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------- |
| [Payroll](./features/payroll/Readme.md)                                      | Wages, claims, signatures, withdrawal, and reconciliation | Existing; alignment due |
| [Safe Wallet](./features/safe/Readme.md)                                     | Setup, treasury, signers, approvals, and execution        | Existing; alignment due |
| [Vesting](./features/vesting/README.md)                                      | Vesting V2 creation, progress, release, and cancellation  | Current model trial     |
| [Accounting migrations](./features/accounting/contract-migration-history.md) | Accounting continuity across contract migrations          | Focused story set       |

See the [Feature User Stories Index](./02_USER_STORIES.md) for the ownership rule and migration
state.

### Specialised or Legacy Feature Documentation

These sources remain useful but have not yet been reviewed under the current feature-documentation
contract.

| Area                                                                  | Current entry point                  |
| --------------------------------------------------------------------- | ------------------------------------ |
| [Authentication](./auth/README.md)                                    | Authentication flows                 |
| [Accounting](./features/accounting/README.md)                         | Accounting scope and detailed models |
| [Backoffice](./features/backoffice/README.md)                         | Administration and feature flags     |
| [Community Credit](./features/community-credit/user-flow-analysis.md) | Current flow analysis and findings   |
| [RBAC](./features/rbac/RBAC.md)                                       | Role-based access control guide      |
| [Database seeding](./features/seed/README.md)                         | Seed usage and implementation        |
| [Serverless wake-up](./features/serverless-wake-up/README.md)         | Wake-up architecture and operations  |
| [Statistics](./features/stats/README.md)                              | Statistics documentation index       |

### Smart Contracts

- [Contract Features Index](./features/contracts/README.md) — current behaviour by contract.
- [Contract Overview](./contracts/README.md) — contract list and high-level concepts.
- [Technical Architecture](./contracts/contracts-technical-architecture.md) — upgrade and design
  patterns.
- [Architecture Diagrams](./contracts/contracts-architecture-diagram.md) — contract relationships.
- [Quick Reference](./contracts/contracts-quick-reference.md) — functions, events, and errors.

Product and contract documentation are complementary. Contract completion does not prove that the
corresponding portal journey exists or has passed human review.

## Platform Guides

- [Feature Documentation Guide](./platform/feature-specification-guide.md)
- [Architecture Overview](./platform/architecture.md)
- [Development Standards](./platform/development-standards.md)
- [Testing Strategy](./platform/testing-strategy.md)
- [Security Standards](./platform/security.md)
- [Performance Standards](./platform/performance.md)
- [Deployment Guide](./platform/deployment.md)

Repository-specific coding guides live under `.github/copilot-instructions/`. Start with the
repository root `AGENTS.md` when performing implementation work.

## Reading by Role

### Product and QA

1. Open the relevant feature README from the user-story index.
2. Follow its lifecycle in story order.
3. Treat checked criteria as the human review record for the stated review date.
4. Use linked implementation evidence to investigate a result, not as a substitute for review.

### Developers

1. Read the feature journey and acceptance criteria.
2. Follow the specialised guide for the subproject being changed.
3. Inspect the linked current code and tests.
4. Update the feature document when the product behaviour changes.

### Smart Contract Engineers

1. Read the product journey when a contract supports a user-facing feature.
2. Read the contract feature document and Solidity standards.
3. Keep product outcomes and contract mechanics linked but separate.

## Writing Feature Documentation

Every new or migrated product feature uses:

```text
docs/features/<kebab-case-feature>/README.md
```

The README contains the complete reviewable journey: scope, product model, lifecycle, status
overview, user stories, acceptance criteria, human validation, evidence, and related documentation.
Detailed rules may live in focused sibling files and are linked from the relevant story.

Follow the [Feature Documentation Guide](./platform/feature-specification-guide.md). In particular:

- keep `As a`, `I want to`, and `So that` on separate lines;
- use `✅ Done` only when every criterion has passed human review;
- use `Last reviewed` only for behaviour review, not editorial updates;
- keep root indexes navigational rather than copying story bodies;
- preserve historical delivery context in GitHub and Git.

## Documentation Validation

Run the Markdown checks for every documentation change:

```bash
npm run lint:md
npm run format:md:check
bash scripts/audit-doc-drift.sh
git diff --check
```

When navigation changes, verify every local link and update the
[Feature User Stories Index](./02_USER_STORIES.md).

## Updating This Hub

Add or remove an entry when its canonical owner changes. Do not copy detailed rules, stories, status
tables, API contracts, or implementation inventories into this file.
