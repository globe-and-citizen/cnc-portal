# Feature documentation guide

Use this guide to document a product's intended capabilities and track their state. It applies to planned, in-progress, and implemented
work. The resulting documentation depends on the project's product decisions and evidence: do not infer requirements, implementation, or
acceptance from this guide alone.

## Concepts

- **Module:** a functional domain grouping related capabilities, such as task management. A submodule may group related features when
  useful.
- **Feature:** a specific capability that enables a user or another system to achieve an identifiable, observable result. It has a clear
  scope and is testable independently of its technical implementation.
- **User story (US):** a need stated from an actor's perspective: **As** an actor, **I want** a capability, **so that** I achieve a
  meaningful outcome. The default story uses the feature's title and has its own identifier derived from the feature root.
- **Acceptance criterion (AC):** a verifiable condition describing an expected result or rule for a story. Each criterion has its own
  identifier and checkbox.

For example, **Task management** is a module; **Create a task** is a feature; the story explains who needs to create it and why; its
criteria describe the observable behavior, including relevant rules and failures. A feature can have one story or multiple stories, each
with its own criteria.

## Folder layout

```text
docs/features/
├── README.md          # Catalogue of modules and features
├── GUIDE.md           # This reusable guide
├── tasks.md           # One file for the task-management module
└── <module>.md        # One file for each additional module
```

The catalogue lists each module and feature, its intended scope and state, and links to its definition. A module file contains the shared
product model, status and test coverage overviews, followed by its features and stories. Submodules are groupings within a module, not
additional required files.

In the catalogue, use a module table (`Module | Scope`) followed by feature tables (`ID | Feature | Intended scope | Status`). Link each
module and feature to its definition in the corresponding module file. Label proposed and undecided scope explicitly.

A feature is defined once regardless of access channel. If a capability is available through an interface, an API, or an agent, specify the
applicable channels and verification without duplicating the product feature.

## Identifiers

Give each module a unique prefix. A feature uses `FEAT-<MODULE>-<FEATURE>`, with a three-digit feature number. The story ID depends on the
number of stories under that feature:

| Feature                                  | Stories                            | Acceptance criteria                            |
| ---------------------------------------- | ---------------------------------- | ---------------------------------------------- |
| `FEAT-TASK-001` with one story           | `US-TASK-001`                      | `AC-US-TASK-001-01`, `AC-US-TASK-001-02`       |
| `FEAT-TASK-001` with two or more stories | `US-TASK-001-01`, `US-TASK-001-02` | `AC-US-TASK-001-01-01`, `AC-US-TASK-001-02-01` |

Story and criterion suffixes use two digits. When adding a second story, rename the existing `US-TASK-001` to `US-TASK-001-01` and its
criteria accordingly; give the new story `US-TASK-001-02`. Update references, anchors, tests, and other consumers, and retain an old-to-new
mapping for the migration. Renaming can break external links: identify and update known consumers before completing it.

Otherwise keep IDs stable, assign unused numbers, and do not renumber entries after reordering or removal. Once a feature has used multiple
story suffixes, retain those suffixes even if a story is later removed, so remaining references stay stable. Preserve any unmigrated
criteria during a migration.

## Feature catalogue file (`README.md`)

The catalogue is a navigation and tracking overview. The module file owns the detailed product model, stories, and criteria; do not copy
those details into the catalogue. Start with a short purpose and status legend, followed by a module table and feature tables grouped by
module.

- **Module / Scope:** link to the module file and summarize its domain or feature count. A count is not a completion measure.
- **ID / Feature:** show the feature ID and link the feature title to its definition in the module file.
- **Intended scope:** state the project's intended release or mark it proposed or undecided. Scope is separate from progress.
- **Status:** use the feature's assessed state; keep it consistent with its module's status overview.

Example catalogue structure and rows:

```markdown
# Feature catalogue

Intended product capabilities and their current assessment.

## Status legend

Not assessed: evidence has not been examined.

## Modules

| Module                      | Scope                        |
| --------------------------- | ---------------------------- |
| [Task management](tasks.md) | Tasks and their organization |

## Features

### Task management

| ID              | Feature                                               | Intended scope      | Status       |
| --------------- | ----------------------------------------------------- | ------------------- | ------------ |
| `FEAT-TASK-001` | [Create a task](tasks.md#feat-task-001-create-a-task) | MVP execution scope | Not assessed |
```

## Module file structure

Each module file is the reference for its product model and feature specifications. Group related features in one file; a submodule label
may clarify their grouping. Start with a short purpose, then use the sections below in order.

### Product model

Define the concepts, relationships, boundaries, and rules shared by multiple features. Explain product behavior and distinguish accepted
decisions from provisional rules. Do not repeat the same model under every story or describe implementation details unless they affect the
product contract.

### Status overview

List each story with these columns; when a feature has multiple stories, use one row per story:

| Column         | Meaning                                                              |
| -------------- | -------------------------------------------------------------------- |
| User story     | Stable story ID, linked to its story section.                        |
| Feature        | Short capability title; use the same title for the default story.    |
| Actor          | Person or external system seeking the outcome.                       |
| Intended scope | Intended release or explicit proposed/undecided scope.               |
| Status         | Assessed feature state; not a substitute for coverage or acceptance. |

### Test coverage overview

List the same stories with `User story`, `Main journey`, `Criteria coverage`, and `Gaps`. Identify the kind of journey and assessed coverage
only when they have been mapped to evidence; otherwise use **Not assessed**. A coverage overview is not the result of the most recent test
run. Do not invent a percentage or declare a gap closed without verification.

### Features and user stories

For each feature, use its feature ID and title as a heading. Record the submodule if applicable, intended scope, and specification status.
Under it, write the default story with its own ID and the same title, then its checkbox criteria. Additional stories use numbered IDs under
the same feature root. Group criteria into **Main journey** and **Business rules and edge cases** where applicable. Close the module with
links to relevant product documents or decision records.

The following is an illustrative module file. The actor and outcomes are examples, not requirements for every project:

```markdown
# Task management

## Product model

A task is work belonging to a project. Tasks may be organized without being duplicated.

## Status overview

| User story  | Feature       | Actor          | Intended scope      | Status       |
| ----------- | ------------- | -------------- | ------------------- | ------------ |
| US-TASK-001 | Create a task | Project member | MVP execution scope | Not assessed |

## Test coverage overview

| User story  | Main journey | Criteria coverage | Gaps         |
| ----------- | ------------ | ----------------- | ------------ |
| US-TASK-001 | Not assessed | Not assessed      | Not assessed |

## Features

### FEAT-TASK-001 Create a task

**Submodule:** Task organization

**Intended scope:** MVP execution scope

**Specification status:** Draft for review

#### US-TASK-001 Create a task

**As** a project member

**I want** to create a task

**So that** my team can track work in the project

##### Acceptance criteria

###### Main journey

- [ ] `AC-US-TASK-001-01` A member can create a task in an accessible project.

###### Business rules and edge cases

- [ ] `AC-US-TASK-001-02` A request without a task title is rejected.

## Related documentation

Link to the project's product model and relevant decision records.
```

Write criteria for the relevant main journey, business rules, and edge or error cases; omit an empty category rather than inventing rules. A
criterion should describe a testable outcome, not just repeat a feature title or prescribe a button or implementation. Record a genuinely
unresolved rule as unresolved instead of presenting it as a settled criterion.

## Create and maintain the catalogue

1. Read the project's vision, decisions or ADRs, product model, scope, and open questions. Distinguish accepted decisions from proposals.
2. Group the functional domains into modules. Identify distinct capabilities within each, using submodules only when they clarify the
   grouping. Do not turn UI clicks or implementation tasks into features.
3. Assign stable IDs and add each feature to both the catalogue and its module file. State its actor, need, expected outcome, scope, and
   acceptance criteria.
4. Capture shared concepts in the module product model. Specify feature-specific behavior in its story and criteria; refer to the project's
   decision records for the rationale.
5. Populate status and coverage overviews from evidence. If the evidence has not been assessed, say so; an unassessed entry does not mean
   tests are absent or passing.
6. Review consistency and links, preserve earlier requirements during migrations, and run the project's documentation and formatting checks.

Use these feature states consistently: **Not assessed** (evidence not examined), **To do** (accepted work not started), **In progress**,
**Awaiting validation**, **Done** (verified and accepted), and **Abandoned** (explicitly dropped). State is distinct from the intended
release. In the coverage overview, identify the main journey, assessed criteria coverage, and known gaps; use **Not assessed** when no
mapping exists.

Leave an AC unchecked until it has been verified. A checked criterion alone does not establish acceptance of the entire story. Track
implementation status, test coverage, test run results, and product acceptance as separate facts; a closed issue, merged PR, or passing CI
does not establish acceptance by itself.

Keep product behavior and criteria in the module files. Decisions and ADRs record decisions; issues and PRs support delivery and review. Do
not copy issue or PR tracking metadata into the product specifications. Keep proposed scope and unresolved choices explicit.
