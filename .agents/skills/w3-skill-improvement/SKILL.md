---
name: w3-skill-improvement
description: Propose actionable improvements to W3 Frame's shared skills when their use reveals a concrete problem or a better approach. Use when identifying or reporting an improvement to a skill from W3-Frame/agent-skills.
---

# Improve a W3 Frame skill

Capture a concrete, reusable improvement to a skill from `W3-Frame/agent-skills` as a GitHub issue in that repository. This can be invoked
explicitly or when using a W3 Frame skill reveals a meaningful improvement. Continue the original task; do not invent an issue when there is
no actionable idea.

1. Identify the affected skill and check its current instructions in the source repository when accessible. Explain the observed limitation,
   the situation in which it matters, and a proposed improvement. Distinguish observed behavior from a hypothesis; do not assume an agent's
   mistake is caused by the skill.
2. Search the repository's existing issues and open pull requests for the same proposal. If it is already tracked, report the existing link
   instead of opening a duplicate. If a search or repository access fails, report the limitation rather than claiming no duplicate exists or
   retrying indefinitely.
3. Generalize the example so it is shareable. Do not include client details, private project information, secrets, infrastructure
   identifiers, or code without verified authorization to share them. If the proposal cannot be made useful without such material, report it
   locally and do not publish it.
4. If user instructions and the active environment permit issue creation, create one issue in `W3-Frame/agent-skills`, not the repository of
   the project being worked on. Prefer `gh` when available. Use an English Conventional Commit title with a matching gitmoji, e.g.
   `fix: 🐛 clarify feature identifier migration`. Include the affected skill, the problem and its impact, a concrete proposal, and any
   relevant sanitized evidence or uncertainty. Assign `hermannleboss` when permitted by the repository's workflow. Do not modify the skill
   or open a pull request unless separately requested.
5. Report the issue link, an existing tracking link, or the reason the proposal could not be submitted. Respect any stricter user or
   environment instructions governing external actions. If creation is not authorized, provide a reviewable issue draft instead.
