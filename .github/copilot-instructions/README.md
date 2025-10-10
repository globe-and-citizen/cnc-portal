# GitHub Copilot Instructions for CNC Portal

This directory contains comprehensive coding guidelines and instructions for the CNC Portal project. Each file focuses on specific aspects of development to maintain consistency and quality.

## Project Overview

CNC Portal is a Crypto Native Corporation Portal built with:

- **Frontend**: Vue.js 3 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + TypeScript + Prisma + PostgreSQL
- **Smart Contracts**: Hardhat + Solidity
- **Subgraph**: The Graph Protocol

## Instruction Files

### Core Development Guidelines

- [`vue-component-standards.md`](./vue-component-standards.md) - Vue.js component development standards
- [`typescript-guidelines.md`](./typescript-guidelines.md) - TypeScript best practices and type safety
- [`web3-integration.md`](./web3-integration.md) - Web3/blockchain integration patterns
- [`state-management.md`](./state-management.md) - Pinia stores and state management

### Testing Guidelines

- [`testing-overview.md`](./testing-overview.md) - Testing philosophy and organization
- [`testing-patterns.md`](./testing-patterns.md) - Common testing patterns and examples
- [`testing-web3.md`](./testing-web3.md) - Web3/contract testing specific patterns
- [`testing-anti-patterns.md`](./testing-anti-patterns.md) - What to avoid in testing

### Quality & Performance

- [`performance-optimization.md`](./performance-optimization.md) - Performance optimization guidelines
- [`accessibility.md`](./accessibility.md) - Accessibility (a11y) requirements
- [`security.md`](./security.md) - Security considerations and best practices
- [`error-handling.md`](./error-handling.md) - Error handling patterns

### Project Specific

- [`repository-patterns.md`](./repository-patterns.md) - Patterns specific to this repository
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

### Placeholder Files (To be expanded)

- 🚧 [TypeScript Guidelines](./typescript-guidelines.md) - Basic structure, needs expansion
- 🚧 [Web3 Integration](./web3-integration.md) - Basic structure, needs expansion
- 🚧 [State Management](./state-management.md) - Basic structure, needs expansion
- 🚧 [Performance Optimization](./performance-optimization.md) - Basic structure, needs expansion
- 🚧 [Accessibility](./accessibility.md) - Basic structure, needs expansion
- 🚧 [Security](./security.md) - Basic structure, needs expansion
- 🚧 [Error Handling](./error-handling.md) - Basic structure, needs expansion
- 🚧 [Repository Patterns](./repository-patterns.md) - Basic structure, needs expansion

## Contributing

These instructions should be updated as the project evolves and new patterns emerge. When adding new patterns or updating existing ones, ensure they are documented with clear examples and rationale.

## Quick Reference

For immediate reference, see the [`review-checklist.md`](./review-checklist.md) for a comprehensive list of what to check before submitting code.
