# GitHub Copilot Instructions for CNC Portal

This directory contains comprehensive coding guidelines and instructions for the CNC Portal project. Each file focuses on specific aspects of development to maintain consistency and quality.

## Project Overview

CNC Portal is a Crypto Native Corporation Portal built with:

- **App**: Vue.js 3 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + TypeScript + Prisma + PostgreSQL
- **Smart Contracts**: Hardhat + Solidity
- **Dashboard**: Nuxt 4 + Nuxt UI + TypeScript + Tailwind CSS
- **Subgraph**: The Graph Protocol

## Instructions

### Docs

For every feature create documentation in the `/docs` folder using Markdown files. Follow the existing structure and naming conventions.

Try to keep each feature documentation short, and use mairmaid for diagrams where applicable.

### Date Manipulation

For Date Manipulation, always use dayjs library.

### Context7 MCP Integration

Always use Context7 when you need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library IDs and get library documentation without requiring explicit requests.

**When to use Context7:**

- Generating code examples or implementation patterns
- Setting up project configurations or dependencies
- Retrieving current API documentation for libraries
- Checking for library compatibility or version-specific features

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

### Testing Guidelines

- [`testing-overview.md`](./testing-overview.md) - Testing philosophy and organization
- [`testing-patterns.md`](./testing-patterns.md) - Common testing patterns and examples
- [`testing-web3.md`](./testing-web3.md) - Web3/contract testing specific patterns
- [`testing-anti-patterns.md`](./testing-anti-patterns.md) - What to avoid in testing

### Project Specific

- [`review-checklist.md`](./review-checklist.md) - Code review checklist
- [`commit-conventions.md`](./commit-conventions.md) - Commit message format and conventions

## Usage

When working on the CNC Portal project, GitHub Copilot will automatically reference these instructions to provide contextually appropriate suggestions that follow the established patterns and best practices.

## File Status

### Complete Files

- ✅ [Testing Overview](./testing-overview.md) - Comprehensive testing philosophy and organization
- ✅ [Testing Patterns](./testing-patterns.md) - Detailed testing patterns with examples
- ✅ [Web3 Testing](./testing-web3.md) - Web3/contract specific testing patterns
- ✅ [Testing Anti-Patterns](./testing-anti-patterns.md) - What to avoid in testing
- ✅ [Vue.js Component Standards](./vue-component-standards.md) - Complete Vue.js guidelines
- ✅ [Review Checklist](./review-checklist.md) - Comprehensive code review checklist
- ✅ [Commit Conventions](./commit-conventions.md) - Detailed commit message standards

## Contributing

These instructions should be updated as the project evolves and new patterns emerge. When adding new patterns or updating existing ones, ensure they are documented with clear examples and rationale.

## Quick Reference

For immediate reference, see the [`review-checklist.md`](./review-checklist.md) for a comprehensive list of what to check before submitting code.
