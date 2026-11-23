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

For example, **Task management** is a module; an optional **Task organization** submodule groups related capabilities. **Create a task**,
**Edit a task**, and **Delete a task** are separate features when each has its own user outcome. The create story explains who needs that
capability and why; its criteria describe observable behavior, including relevant rules and failures. A feature generally has one story. Add
stories only for genuinely distinct needs within the same capability, not for technical layers, channels, or individual UI clicks. Inspect
the existing product model before regrouping historical entries; preserve established conventions, identifiers, requirements, and links
rather than forcing a migration to match this example.

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
- **Status:** mirror the single story status for a one-story feature. For multiple stories, show the distribution (for example,
  `1 Done · 1 Validation · 1 In Progress`), not an unexplained aggregate. The module overview owns each individual story status. Keep both
  views consistent when status or feature membership changes; counts alone do not establish completion or review across stories.

Example catalogue structure and rows:

```markdown
# Feature catalogue

Intended product capabilities and their current assessment.

## Status legend

- 📝 Draft: the target behavior or acceptance contract is being defined.
- 🧪 Validation: implementation is verified; product review is pending.
- 🚧 In Progress: the defined story has incomplete or unverified criteria.

## Modules

| Module                      | Scope                        |
| --------------------------- | ---------------------------- |
| [Task management](tasks.md) | Tasks and their organization |

## Features

### Task management

| ID              | Feature                                               | Intended scope      | Status       |
| --------------- | ----------------------------------------------------- | ------------------- | ------------ |
| `FEAT-TASK-001` | [Create a task](tasks.md#feat-task-001-create-a-task) | MVP execution scope | 📝 Draft |
| `FEAT-TASK-002` | [Assign a task](tasks.md#feat-task-002-assign-a-task) | MVP execution scope | 1 🧪 Validation · 1 🚧 In Progress |
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

| Column         | Meaning                                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| User story     | Stable story ID, linked to its story section.                                |
| Feature        | Short capability title; use the same title for the default story.            |
| Actor          | Person or external system seeking the outcome.                               |
| Intended scope | Intended release or explicit proposed/undecided scope.                       |
| Status         | Story state under the contract below; not a substitute for coverage details. |

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
| [US-TASK-001](#us-task-001-create-a-task) | Create a task | Project member | MVP execution scope | 📝 Draft |
| [US-TASK-002-01](#us-task-002-01-assign-a-task-to-a-member) | Assign a task | Project member | MVP execution scope | 🧪 Validation |
| [US-TASK-002-02](#us-task-002-02-assign-a-task-to-a-team) | Assign a task | Project member | MVP execution scope | 🚧 In Progress |

## Test coverage overview

| User story  | Main journey | Criteria coverage | Gaps         |
| ----------- | ------------ | ----------------- | ------------ |
| US-TASK-001 | Not assessed | Not assessed      | Not assessed |
| US-TASK-002-01 | Not assessed | Not assessed | Not assessed |
| US-TASK-002-02 | Not assessed | Not assessed | Not assessed |

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

### FEAT-TASK-002 Assign a task

**Intended scope:** MVP execution scope

**Specification status:** Defined

#### US-TASK-002-01 Assign a task to a member

**As** a project member, **I want** to assign a task to a member, **so that** responsibility is clear.

- [x] `AC-US-TASK-002-01-01` An authorized member can assign a task to a project member.

Example evidence: the authorized assignment was observed at runtime; human product review is pending.

#### US-TASK-002-02 Assign a task to a team

**As** a project member, **I want** to assign a task to a team, **so that** the team can coordinate responsibility.

- [ ] `AC-US-TASK-002-02-01` An authorized member can assign a task to a project team.

The criterion has not been assessed; this status does not establish that work has started.

## Related documentation

Link to the project's product model and relevant decision records.
```

Write each criterion as one cohesive observable outcome or independently verifiable business rule with a clear pass/fail interpretation.
Split outcomes that can fail independently or need materially different evidence; keep attributes of one cohesive result together when
appropriate. Cover relevant happy paths, business rules, permissions, boundaries, errors, and recovery without making every category
mandatory. Prefer product behavior that survives a visual redesign; place presentation-specific, accessibility, and design requirements in
their appropriate scope. Record unresolved rules as unresolved rather than presenting them as settled criteria.

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

## Story status and evidence

These are defaults for new catalogues; preserve an existing project's status conventions when adopting this guide. The module overview is
authoritative for each story's status; the catalogue mirrors it for navigation.

| Story status   | Meaning                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📝 Draft       | Material target behavior or its acceptance contract is still being defined.                                                                                         |
| 🚧 In Progress | The story is defined and at least one applicable criterion is incomplete or unverified. This label alone does not establish that active implementation has started. |
| 🧪 Validation  | All applicable criteria have been verified as implemented; human product review is pending.                                                                         |
| ✅ Done        | All applicable criteria have been verified as implemented and human product review passed.                                                                          |
| 🔗 Reference   | Another linked story owns the detailed behavior and validation.                                                                                                     |

Draft takes precedence while material behavior or the acceptance contract is being defined, regardless of unchecked criteria. An empty or
provisional criterion list cannot establish that all criteria are implemented. Once the contract is defined, use In Progress if any
applicable criterion is incomplete or unverified; explain the evidence state where useful. Move to Validation only after all applicable
criteria are verified, and to Done only after human product review passes. Record that review and its scope using the project's established
convention. A closed issue, merged PR, passing CI, or checked criteria alone do not prove acceptance. A reference story links its canonical
owner; do not duplicate criteria or imply that its behavior has been validated.

- `[x]` means current code, observed runtime behavior, or appropriate test evidence has been examined and confirms implementation of that
  criterion. It does not independently record product acceptance.
- `[ ]` means incomplete or unverified. Unverified does not mean absent; a checkbox alone does not establish that work has started.

For a default new catalogue, explicitly label evidence **Not assessed** when it has not been examined; it is an evidence qualifier, not a
verified delivery status. Record explicitly abandoned scope as **Abandoned**, with its decision linked where available; it is a scope
disposition, not proof of delivery. Do not infer either from an unchecked box. If a story is defined but evidence is unassessed, its status
is In Progress with that qualifier.

When behavior changes, identify affected criteria and prior product review. Mark affected criteria unverified until evidence is examined
again, update the story status, and request renewed human review for the affected behavior before claiming acceptance. Retain unaffected
verified evidence where its scope remains valid. A purely editorial change does not refresh a behavior-review date or imply a new product
review. If dates are recorded, distinguish a document edit date from a behavior-review date.

## Coverage and proof

Keep intended implementation, implementation verification, expected test coverage, test execution results, and human product acceptance
distinct. Inspect representative test assertions and their scope before treating a test as evidence for a criterion. A test marker,
identifier, or file path provides traceability, not proof of assertion quality or a current passing run. Record unassessed coverage as such:
a missing reference does not prove behavior or tests are absent.

Choose proof appropriate to the rule, responsible boundary, and material failure risks. Distinguish focused tests, mocked journeys, and
integrated journeys where relevant; no single layer proves every responsibility, and an integrated test is not mandatory for every
criterion. Record known gaps and unresolved proof decisions without inventing percentages or results. Detailed proof registries are optional
and proportional to the project.

## Separate product facts and ownership

Intended scope, specification, story status, current access, and coverage answer different questions. For example, a planned task assignment
feature can have a defined specification and an In Progress story with unassessed criteria, while current access and test coverage are also
**Not assessed**. It may be documented before an interface or API exists. A planned release does not establish accessibility,
implementation, acceptance, or coverage. To claim current access, inspect applicable entry points, permissions, and meaningful actions for
the actors concerned; otherwise say access has not been assessed. Do not infer any of these dimensions from another.

By default, the module document owns current product stories, criteria, and story statuses; the feature catalogue links to them and
summarizes feature membership and status. Update both when membership or story status changes. Product decision records own decisions;
issues, pull requests, and Git own delivery tracking and history. Link the relevant owners instead of copying requirements or creating
parallel archives. Follow existing repository ownership and structure where present; this default is not permission to overwrite or
reorganize established documentation.
