# Development Standards

This page owns the backend route responsibility standard and routes contributors to the canonical guide for other engineering standards. It
is not a second copy of the contribution contract or the framework-specific guides. See
[Documentation Maintenance](./documentation-maintenance.md) before adding or moving a standard.

## Backend route standard

New or changed routes should preserve this responsibility order:

1. Authenticate the caller.
2. Validate body, query, and path shape and normalize values with Zod.
3. Load persisted resources required by the operation.
4. Authorize the caller against persisted roles, membership, ownership, or resource state.
5. Execute reusable business rules in a service and translate outcomes into HTTP responses in the controller.
6. Rely on Prisma and database constraints for final persistence guarantees.

| Layer                        | Responsibility                                                   |
| ---------------------------- | ---------------------------------------------------------------- |
| Zod schema and middleware    | Validate shape, type, format, range, enum, and normalized values |
| Authentication middleware    | Establish caller identity and reject unauthenticated requests    |
| Loading or policy middleware | Load persisted state and enforce resource-specific access        |
| Service                      | Own reusable workflows and cross-resource business rules         |
| Controller                   | Translate service outcomes into Express responses                |
| Prisma or database           | Apply atomic persistence and final integrity constraints         |

Zod must not read the database or decide resource authorization. A controller must not repeat structural validation or become the only owner
of reusable team, role, or workflow rules. Use the existing helpers and policies:

- Zod helpers: [backend/src/validation/index.ts](../../backend/src/validation/index.ts)
- Shared request pipeline: [Request Validation](../implementation/request-validation/README.md)
- Persisted team access: [teamAuthzMiddleware.ts](../../backend/src/middleware/teamAuthzMiddleware.ts)
- Backend role access: [roleMiddleware.ts](../../backend/src/middleware/roleMiddleware.ts)

Validated body and path values replace their raw request sections. Parsed query values are available through `res.locals.validatedQuery`.
Controllers consume normalized values and do not parse the same input again.

Use `validateRequest()` only when one request section depends on another; otherwise use the smallest body, query, or params validator.
Database-backed rules such as team membership, archived state, resource existence, and ownership belong in middleware or services. Keep
exact HTTP payloads in Zod and OpenAPI; this guide owns responsibility boundaries, not a second copy of every route schema.

## Find other engineering standards

| Area                                               | Canonical guide                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Shared contribution workflow and required commands | [`CONTRIBUTION.md`](../../CONTRIBUTION.md)                                                                               |
| Agent workflow                                     | [`AGENTS.md`](../../AGENTS.md)                                                                                           |
| Vue components and composables                     | [Vue Component Standards](../../.github/copilot-instructions/vue-component-standards.md)                                 |
| Testing principles and boundaries                  | [Testing Strategy](./testing-strategy.md) and [Testing Overview](../../.github/copilot-instructions/testing-overview.md) |
| Security                                           | [Security Standards](./security.md)                                                                                      |
| Performance                                        | [Performance Standards](./performance.md)                                                                                |
| Canonical display formatting                       | [Formatting Standards](../../.github/copilot-instructions/formatting-standards.md)                                       |
| Contract writes and cache invalidation             | [Contract-write Guide](../../app/src/composables/contracts/README.md)                                                    |
| Solidity review and validation                     | [Solidity Audit Checklist](../../.github/copilot-instructions/solidity-audit-checklist.md)                               |
| Commit titles and messages                         | [Commit Conventions](../../.github/copilot-instructions/commit-conventions.md)                                           |
| Review criteria                                    | [Review Checklist](../../.github/copilot-instructions/review-checklist.md)                                               |

Exact runtime and dependency versions belong to each subproject's `package.json`, lockfile, and tool configuration.
