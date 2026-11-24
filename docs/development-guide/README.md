# Development Guide

Use this page to choose the smallest relevant development guide. It does not duplicate project setup, contribution rules, code examples, or
test procedures.

## Start here

- **Human contributors:** [Root README](../../README.md) for project orientation, then [CONTRIBUTION.md](../../CONTRIBUTION.md) for shared
  workflow and validation.
- **AI agents:** follow the same contribution contract and [AGENTS.md](../../AGENTS.md) for agent-specific execution and evidence.
- **Documentation changes:** use [Documentation Maintenance](../platform/documentation-maintenance.md) to identify the canonical owner,
  update it, and keep the result concise.

## Choose a guide

| Task                                           | Guide                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Product behaviour, user stories, or acceptance | [Feature Documentation Guide](../platform/feature-specification-guide.md) and the affected `docs/features/` owner                     |
| Shared runtime behaviour                       | [Implementation Documentation Guide](../platform/implementation-documentation-guide.md) and the affected `docs/implementation/` owner |
| Contract behaviour                             | [Contract Behaviour Index](../contracts/features/README.md)                                                                           |
| Development relationship assessment            | [Development Relationship Validation](./relationship-validation.md)                                                                   |
| Issue and Kanban fields                        | [Kanban Project Fields](./kanban-project.md)                                                                                          |
| Local development reports                      | [Local Reports Workspace](./local-reports.md)                                                                                         |
| Database seeding                               | [Database Seeding](./database-seeding/README.md)                                                                                      |
| Static analysis                                | [Knip Analysis](./static-analysis.md)                                                                                                 |
| Code audits                                    | [Code Audits](./code-audit.md)                                                                                                        |
| Autonomous semantic audits                     | [Autonomous Audit Contracts](./autonomous-audits/README.md)                                                                           |
| Testing and E2E setup                          | [Testing Guide](../testing/README.md) and the [Application E2E Guide](../../app/test/README.md)                                       |
| Deployment or release                          | [Deployment Guide](../platform/deployment.md) and [Release Procedure](../platform/RELEASE_AUTOMATION.md)                              |
| Coding standards                               | [Development Standards Index](../platform/development-standards.md) and the affected specialized guide                                |

## Validate

Use the shared command list in [CONTRIBUTION.md](../../CONTRIBUTION.md#required-validation-before-pushing) and the affected subproject's
`package.json`. The subproject manifests own runtime and package-manager requirements; do not copy version numbers into this index.
