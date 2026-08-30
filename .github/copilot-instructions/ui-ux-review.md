# UI/UX Reviewer Journeys

Every pull request declares one UI/UX impact level in its description. This makes the product surface of a change reproducible for the
reviewer without duplicating product documentation.

The PR description is review evidence. Canonical feature READMEs under `docs/features/` remain the source of truth for user-story status and
functional acceptance criteria. Follow the [Feature Documentation Guide](../../docs/platform/feature-specification-guide.md) when a change
affects those criteria.

## Choose the impact level

| Impact level | Use when                                                                                                                                 | Required review material                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `none`       | The PR has no user-facing visual or interaction effect.                                                                                  | Select the level. Explain the classification during review if the CI warning lists likely UI paths. |
| `visual`     | Presentation, layout, responsive behaviour, accessibility affordance, or interaction feedback changes without changing the product flow. | Surface or entry point, review scope, expected result, and evidence.                                |
| `journey`    | A user-facing action, permission boundary, state transition, entry route, or multi-step flow changes.                                    | Canonical story, entry point, prerequisites, actors, action/result table, and evidence.             |

Select exactly one level in `## UI/UX Reviewer Journey`. The CI contract blocks a missing selection and incomplete `visual` or `journey`
material. It warns, rather than blocks, when a PR marked `none` changes likely UI files; the reviewer decides whether the classification is
honest.

## Write a journey

Use the PR template's fields. Keep the journey scoped to the changed behaviour rather than reproducing a whole feature or Sprint scenario.

```markdown
**Canonical stories / use cases:** `US-COMPANIES-005`
**Entry point:** `/companies/:id/members`
**Prerequisites:** Company A exists; two test accounts are available.
**Actors:** Company owner A → company member B
**Evidence:** Focused automated test and a short recording.

| Step | Actor | Action | Expected result |
| --- | --- | --- | --- |
| 1 | Company owner A | Add member B | B appears with the chosen role. |
| 2 | Company member B | Open the company | B can access only the permitted workspace. |
```

An actor names a permission boundary, not necessarily a different human. When a scenario needs two users, use two test accounts or profiles
and record the hand-off. A journey can map several actions to the same user story, or one action to several stories. Technical setup and
assertions may omit a story only when they do not express a product outcome.

## Reference product documentation

For a `journey`, link at least one canonical `US-*` identifier. The CI contract checks that every referenced identifier exists in the
current `docs/features/` README set. It cannot decide whether prose still expresses the intended business behaviour: the reviewer compares
each expected result with the linked story's acceptance criteria.

A successful reviewer journey is human-validation evidence. It does not automatically check a criterion, change `Last reviewed`, or move a
story to `✅ Done`; apply the feature documentation review contract after the relevant human review.

## Reviewer checklist

- Confirm the selected impact level matches the changed product surface.
- Reproduce the stated entry point, prerequisites, actor hand-offs, and expected outcomes.
- Compare the result with the linked canonical user story and its acceptance criteria.
- Inspect visual evidence at the stated viewport or interaction scope when relevant.
- Record failures as review findings or linked follow-up work; do not mark blocked behaviour as passing.
