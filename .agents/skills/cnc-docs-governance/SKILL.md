---
name: cnc-docs-governance
description: Maintain CNC Portal agent guidance and implementation documentation without duplicating authority. Use when changing AGENTS.md, repository skills, developer guides, feature documentation, or documentation validation.
---

# CNC documentation governance

Keep each rule in one authoritative place and link to it from the entry points that need it.

## Choose the owner

- `AGENTS.md` holds universal execution, safety, workflow, and validation rules.
- `.agents/skills/*/SKILL.md` holds task-specific procedures and routing.
- `.github/copilot-instructions/` holds detailed coding, testing, review, and formatting guidance.
- `docs/` holds product and implementation behaviour; code and tests are executable evidence.

Do not copy detailed guidance into a skill or `AGENTS.md`; point to its owner. Remove obsolete backlinks when ownership moves.

## Change safely

1. Inspect the affected source, linked guides, and the runtime or test evidence before editing.
2. Keep current behaviour separate from historical issue and PR context.
3. Use compact navigation in entry points; put variants and examples in their specialised guide.
4. Run `npm run lint:md`, `npm run format:md:check`, and `bash scripts/audit-doc-drift.sh` after changing agent instructions, skills, or linked guides. The format check covers Markdown changed since `origin/develop`; CI supplies its pull-request base SHA.

## Skill maintenance

- Keep frontmatter trigger descriptions precise.
- Keep a skill procedural and concise; add a script only for a fragile repeatable operation.
- Validate each changed skill with the local Skill Creator `quick_validate.py` script.
- Regenerate `agents/openai.yaml` if its UI metadata no longer matches the skill.
