# CNC Portal Testing Strategy

**Status:** Current platform-level principles

This page defines the testing boundaries. Executable commands, fixtures, acceptance evidence, and detailed patterns belong to the linked
specialized guides and the repository's current code.

## Testing layers

| Layer              | Tooling                                                               | Primary responsibility                                                                                      |
| ------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Unit and component | Vitest, Vue Test Utils                                                | Pure logic, component contracts, loading/error states, and local interaction behaviour                      |
| Backend            | Vitest, Supertest, Prisma test database                               | Request validation, controllers, persistence, authentication, and API boundaries                            |
| Smart contract     | Hardhat, Mocha, Chai                                                  | Solidity invariants, authorization, reverts, events, upgrades, and multi-contract behaviour                 |
| Browser acceptance | Playwright with the in-browser wagmi mock connector                   | Browser-visible flows with simulated or narrow local boundaries, including validation and recovery variants |
| Integrated E2E     | Playwright with the real frontend, backend, database, and local chain | Business journeys whose acceptance evidence requires persisted backend or chain state                       |

The current Playwright profiles and their setup commands are maintained in the [testing guide](../testing/README.md) and the
[application E2E guide](../../app/test/README.md). The business-path evidence map is the [Integrated E2E Paths](../testing/e2e-paths.md)
document.

## Core principles

- Test observable behaviour and domain outcomes rather than implementation details.
- Keep each test focused on one outcome and use declarative present-tense titles.
- Use stable `data-test` attributes, accessible roles, rendered text, emitted events, and public props as test surfaces.
- Reuse the shared Vitest mocks; do not re-register globally mocked modules inside individual specs.
- Keep fixtures and factories limited to prerequisites outside the journey's own acceptance evidence.
- Treat static traceability, a local run, a CI run, and human product validation as separate evidence types.
- Add acceptance identifiers only to representative tests whose assertions directly prove the referenced criterion.

## Coverage policy

Coverage percentages are diagnostic signals, not completion claims. A passing test suite with weak assertions is not adequate evidence, and
a missing percentage does not by itself prove missing product behaviour. Use the acceptance-coverage report to find traceability gaps, then
inspect the assertions and the responsible layer.

The feature README owns product acceptance criteria and human-validation status. Code and tests provide executable evidence. GitHub issues,
pull requests, and CI reports preserve delivery status and execution history.

## Required quality gates

The authoritative local commands are defined in [`AGENTS.md`](../../AGENTS.md). Before pushing a change, run every applicable subproject
lint, format, type-check, compile, and test command. For documentation or testing-guide changes, also run the repository documentation
freshness, Markdown, and drift checks described there.

## References

- [Testing guide](../testing/README.md)
- [Unit testing](../testing/unit-testing.md)
- [Mock system](../testing/MOCK_SYSTEM.md)
- [Playwright fixture catalogue](../testing/e2e-fixtures.md)
- [Testing overview](../../.github/copilot-instructions/testing-overview.md)
- [Testing patterns](../../.github/copilot-instructions/testing-patterns.md)
- [Testing anti-patterns](../../.github/copilot-instructions/testing-anti-patterns.md)
