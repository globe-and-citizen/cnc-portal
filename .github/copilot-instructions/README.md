# Development Standards for CNC Portal

This directory contains shared coding, testing, formatting and review standards for human developers and AI agents. The directory name is
retained for existing tool integrations; it does not make these technical standards agent-only.

## Project Overview

> [`README.md`](../../README.md) owns setup; [`CONTRIBUTION.md`](../../CONTRIBUTION.md) owns the shared contribution contract and validation
> commands. [`AGENTS.md`](../../AGENTS.md) adds AI-agent execution procedures. This folder holds deeper area-specific standards.

CNC Portal is a Crypto Native Corporation Portal built with:

- **App**: Vue 3 + TypeScript + Vite + Tailwind v4 + Nuxt UI v4
- **Backend**: Node.js + TypeScript + Prisma + PostgreSQL
- **Smart Contracts**: Hardhat + Solidity
- **Dashboard**: Nuxt 4 + Nuxt UI + TypeScript + Tailwind CSS
- **Subgraph**: The Graph Protocol

## Instructions

### Docs

For every feature create and maintain canonical documentation in the `/docs` folder. Before editing behavioural code, find the owner
described by the [Documentation Freshness Policy](../../docs/platform/documentation-freshness-policy.md), then update that document in the
same change. CI rejects behavioural source changes with no canonical evidence owner or an unchanged owner document.

Keep each feature document short, use Mermaid for diagrams where applicable, and follow the
[Feature Documentation Guide](../../docs/platform/feature-specification-guide.md).

### Display Formatting

Never format a value for display by hand — no `Intl.*`, `toLocaleString`, `toFixed`, or dayjs pattern strings outside the canonical module.
Ask `@/utils/format` (app) / `~/utils/format` (dashboard) for a named style. ESLint enforces it. See
[`formatting-standards.md`](./formatting-standards.md).

### Date Manipulation

For Date Manipulation, always use dayjs library — and for _displaying_ a date, through the named helpers in
[`formatting-standards.md`](./formatting-standards.md) rather than a pattern string at the call site.

### Security

**Input Validation:**

- Validate all user inputs on both client and server
- Sanitize data before display
- Use proper validation libraries (e.g., Zod, Yup)

**Smart Contract Interactions:**

- Always validate contract addresses before interactions
- Implement proper access control checks
- Handle contract revert reasons gracefully
- Use secure random number generation

### Accessibility

Make all interfaces accessible for everyone, including users with disabilities

**ARIA Labels:**

- Provide proper ARIA labels for interactive elements
- Use semantic HTML elements

- Use proper heading hierarchy
- Provide alternative text for images

**Checklist:**

- Use semantic HTML
- Add alt text to images
- Ensure color contrast
- Support keyboard navigation
- Use ARIA attributes as needed
- Test with screen readers

**Resources:**

- [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## Instruction Files

### Core Development Guidelines

- [`vue-component-standards.md`](./vue-component-standards.md) - Vue.js component development standards
- [`formatting-standards.md`](./formatting-standards.md) - Canonical display formatting (money, tokens, dates, addresses)

### Testing Guidelines

- [`testing-overview.md`](./testing-overview.md) - Testing philosophy and organization
- [`testing-patterns.md`](./testing-patterns.md) - Common testing patterns and examples
- [`testing-web3.md`](./testing-web3.md) - Web3/contract testing specific patterns
- [`testing-anti-patterns.md`](./testing-anti-patterns.md) - What to avoid in testing

### Project Specific

- [`review-checklist.md`](./review-checklist.md) - Code review checklist
- [`ui-ux-review.md`](./ui-ux-review.md) - Reproducible reviewer journeys for UI and UX pull requests
- [`solidity-audit-checklist.md`](./solidity-audit-checklist.md) - Pre-merge Solidity audit checklist for `contract/` PRs (Slither + manual
  review)
- [`commit-conventions.md`](./commit-conventions.md) - Commit message format and conventions

## Usage

Human developers read the standards relevant to their change from the contribution guide. AI tools can load them as context, but must also
follow AGENTS for local planning, documentation lookup tools, delivery operations and evidence readback.

## Contributing

These instructions should be updated as the project evolves and new patterns emerge. When adding new patterns or updating existing ones,
ensure they are documented with clear examples and rationale.

## Quick Reference

For immediate reference, see the [`review-checklist.md`](./review-checklist.md) for a comprehensive list of what to check before submitting
code.
