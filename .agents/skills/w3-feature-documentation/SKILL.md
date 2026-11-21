---
name: w3-feature-documentation
description: Create or update a product feature catalogue, user stories, and acceptance criteria grounded in project decisions and evidence. Use when documenting intended product capabilities, their scope, status, or coverage; not for implementation-only tasks.
---

# Feature documentation

Document observable product capabilities so that people can understand and verify them independently of their implementation. Follow the
target repository's instructions and established conventions; adapt the approach below to the requested scope. Do not overwrite existing
documentation or migrate identifiers merely to match a template.

1. Inspect relevant project instructions, existing feature documentation, product vision, decisions, scope, and open questions. Separate
   accepted decisions from proposals and unknowns. Ask for clarification when a missing product decision prevents a meaningful
   specification; otherwise label it unresolved and continue with supported work.
2. Read [the feature documentation guide](references/feature-guide.md) for the proposed catalogue, module files, identifiers, stories, and
   criteria. Use it as the default for a project without an established convention, not as authority for product requirements or permission
   to rewrite existing documentation. Respect the user's requested scope and language.
3. Identify modules, optional submodules, distinct capabilities (features), actors, stories, and verifiable acceptance criteria from
   available evidence. For example, creating, editing, and deleting a task are separate features when each has its own outcome. Distinguish
   intended scope from delivery progress. Do not invent product decisions, test results, or acceptance. Mark provisional content and
   unresolved questions explicitly.
4. Add or update the relevant catalogue and module entries consistently. For new documentation using this guide, derive story IDs from the
   feature root. When adding a second story, follow the guide's migration procedure for existing story and criterion IDs, including mapping
   and updating known references. Preserve existing requirements and unmigrated criteria; do not migrate other existing identifier
   conventions merely to match the guide.
5. Assess each story and its criteria against evidence actually examined, following the guide’s status and review transitions. Keep intended
   scope, specification, current access, coverage, test results, and human acceptance distinct. Reassess affected evidence and review after
   behavior changes; record unknowns separately from confirmed gaps.
6. Check consistency, links, and identifiers, and run applicable documentation checks. Report the files changed, unresolved decisions, and
   the evidence and checks actually used. Do not create issues, commit, or publish unless authorized by the request or repository
   instructions.

If using this skill reveals a concrete, reusable improvement to its own instructions, use `w3-skill-improvement` if available to propose it
in the W3 Frame skills repository. If that skill is not installed, mention the idea to the user. Continue the original task and do not
invent improvements just to create an issue.
