# Documentation Maintenance

**Status:** Current

This guide defines how contributors keep project documentation useful, current, and easy to navigate. It complements the
[documentation freshness policy](./documentation-freshness-policy.md), which owns the automated implementation-evidence gate, and the
[feature](./feature-specification-guide.md) and [implementation documentation](./implementation-documentation-guide.md) guides, which own
their document structures.

## Find the right owner

| Need                                               | Canonical owner                                            |
| -------------------------------------------------- | ---------------------------------------------------------- |
| Set up the project                                 | Root and subproject README files                           |
| Shared contribution workflow and validation        | [`CONTRIBUTION.md`](../../CONTRIBUTION.md)                 |
| Agent execution, tools, and evidence procedure     | [`AGENTS.md`](../../AGENTS.md)                             |
| Procedure for one specific task                    | The matching skill in `.agents/skills/`                    |
| Coding, testing, review, and formatting standards  | The relevant `.github/copilot-instructions/` guide         |
| Product goal and user-visible acceptance           | `docs/features/<module>/README.md`                         |
| Shared current runtime behaviour                   | `docs/implementation/<capability>/README.md`               |
| Smart-contract behaviour                           | `docs/contracts/features/<contract>/README.md`             |
| Platform-wide engineering policy                   | The relevant `docs/platform/` guide                        |
| Durable technical decision and trade-offs          | `docs/adr/`                                                |
| Exact API, configuration, or executable behaviour  | OpenAPI, manifests, generated artifacts, source, and tests |
| Active delivery, ownership, or completion evidence | GitHub issue, pull request, CI, or Git                     |

Use [`docs/README.md`](../README.md) to navigate. An index routes to owners; it does not restate their rules or status.

## One owner, linked consumers

- Choose one canonical owner for each rule, decision, journey, or runtime guarantee. Put the complete explanation there.
- Other entry points should state only what their audience needs to choose the right owner, then link to it.
- If a subject has separate product and technical responsibilities, split them between the feature and implementation or contract owners and
  link the two. Do not copy criteria, lifecycle rules, or status between them.
- Treat package manifests and lockfiles as the source for dependency and runtime versions. Treat generated OpenAPI and ABI artifacts as the
  source for exact interfaces. Link to these sources rather than maintaining a second version or signature table.
- Use an ADR for a durable decision and its trade-offs. Use GitHub for active plans and delivery history. Do not turn either into current
  runtime documentation.
- When a new owner replaces an old one, move the current information, update incoming links and indexes, and mark the old page superseded or
  historical. Do not leave two active authorities.

## Keep only useful content

Before adding or extending a page, identify its reader and the task, decision, or guarantee it supports. Include only information that helps
that reader act, decide, or verify:

- current facts that cannot be found reliably from the owning code or generated interface;
- boundaries, invariants, failure behaviour, prerequisites, risks, and recovery steps;
- concise examples that clarify a non-obvious pattern and match a current test or implementation;
- links to executable proof and the next relevant owner.

Prefer a focused section in an existing owner over a new file. Create a separate page only when it has a distinct audience or task, or when
keeping the owner's main page reviewable requires it. Avoid copying code, API schemas, test inventories, release notes, issue status, or
general advice that a specialised guide already owns. Do not add a date, metric, checklist, glossary, diagram, or template without a
specific reader need.

Keep entry points short. Use a table only when comparison or scanning benefits the reader; use the
[table readability rule](./feature-specification-guide.md#table-readability). Use Mermaid diagrams only when a relationship, sequence, or
state is meaningfully clearer than a short explanation.

## Update and review workflow

### Before changing documentation

1. Identify the intended reader, the source of truth, and the canonical owner.
2. Read that owner, its specialised guide, and the linked source or test evidence relevant to the change.
3. Inspect incoming links and affected consumers. Decide whether this is a behaviour change, a policy/decision change, or editorial
   clarification.
4. If ownership, product intent, an economic rule, security policy, or human acceptance is unclear, record the question and its owner. Do
   not resolve it by inventing a requirement.

### During the change

5. Update each affected owner in the same change as the behaviour, policy, or durable decision it documents.
6. Revise or remove stale copies and update navigation links; do not append another summary beside the old one.
7. Link exact source and tests as evidence. Keep implementation review dates and immutable source attestations distinct from product
   acceptance, as described by the owning guide.
8. For editorial-only changes, avoid changing product claims or marking behaviour reviewed unless the evidence was actually inspected.

### Before review or merge

9. Record the canonical owners, affected consumers, inspected revision, validation commands and results, unresolved gaps, and any human
   decisions still required in the issue or pull request.
10. Run the relevant documentation checks below and the applicable subproject checks. Review the rendered links, headings, and navigation.
11. Keep an unresolved claim or missing product decision visible as a gap; do not turn a passing linter, test, or merge into human
    acceptance.

## Human and agent responsibilities

Human contributors and agents use the same ownership, evidence, and quality rules. Humans may make product and policy decisions within their
authority. Agents may document verified code behaviour and propose options, but must not infer product intent, approve a policy, invent an
acceptance result, or present a proposal as decided.

Agents must follow [`AGENTS.md`](../../AGENTS.md), use the matching repository skill, identify the owner before editing, and inspect current
code, configuration, and tests. When blocked on a human decision, they should document the alternatives, affected owner, and precise
question, then leave the dependent claim or implementation pending. In the issue or pull request they must distinguish:

- current behaviour from proposed behaviour;
- source inspection from executed tests;
- local results from CI results;
- technical verification from human product acceptance;
- completed work from follow-up and blockers.

## Retire rather than accumulate

- Remove or rewrite obsolete current instructions when their replacement is known; preserve historical context in Git or a clearly labelled
  archive when it remains useful.
- Mark archived plans, snapshots, and superseded guides so they cannot be mistaken for current instructions. Remove stale pages from active
  indexes and update links before retiring them.
- Keep report files, agent scratchpads, test output, and delivery logs out of canonical product and implementation guides.
- Do not schedule recurring documentation rewrites solely because a date elapsed. Re-review an owner when its linked source, decision,
  consumer, interface, or validation claim changes, or when a concrete contradiction is found.

## Validation boundaries

Run the relevant checks from [`AGENTS.md`](../../AGENTS.md). The repository's documentation checks can verify links and repository paths,
Markdown format and lint, acceptance traceability, implementation-evidence freshness, selected drift rules, and diagram syntax where
configured. These checks do **not** determine whether a product requirement is correct, a guide is useful, a decision is approved, or a
human has accepted a feature. Authors and reviewers must assess those claims against current evidence and the responsible decision owner.

For documentation-focused work, run:

```bash
npm run test:documentation-governance
npm run test:docs-freshness
npm run lint:docs-freshness
npm run test:acceptance-traceability
npm run lint:acceptance-traceability
npm run lint:md
npm run format:md:check
bash scripts/audit-doc-drift.sh
```

If a repository-wide check fails, identify whether the failure is in the changed scope or pre-existing; do not silently broaden the change
to unrelated documents.
