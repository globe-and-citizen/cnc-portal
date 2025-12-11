# Step 4: Create Development Standards Documentation

**Priority**: HIGH  
**Estimated Time**: 1-2 hours  
**Impact**: Establishes code quality standards for contributors

## Problem

The file `/docs/platform/development-standards.md` is referenced in the documentation structure but does not exist. This means developers lack a central reference for coding standards, best practices, and quality requirements.

## Solution

Create comprehensive development standards documentation that consolidates existing guidelines and establishes clear expectations.

## AI Prompt

```
I need to create comprehensive development standards documentation at /Users/test/Documents/data/gc/cnc-portal/docs/platform/development-standards.md

Context:
- The CNC Portal uses TypeScript throughout (frontend, backend, contracts, subgraph)
- Extensive coding guidelines exist in .github/copilot-instructions/ folder
- Project uses ESLint, Prettier, and pre-commit hooks
- Strong emphasis on testing, accessibility, and Web3 best practices

Please create development-standards.md with the following structure:

# Development Standards

## Overview
Purpose of this document and importance of following standards

## Code Quality Standards

### TypeScript Standards
- Strict mode configuration
- Type safety requirements
- Avoid 'any' type
- Interface vs Type usage
- Import/export conventions

### Code Style
- ESLint configuration
- Prettier formatting rules
- Naming conventions (camelCase, PascalCase, SCREAMING_SNAKE_CASE)
- File naming conventions
- Directory structure conventions

### Code Organization
- File structure patterns
- Module organization
- Import ordering (external → internal → relative)
- Component organization (Vue.js specific)

## Frontend Standards (Vue.js)

### Component Standards
- Always use Composition API with <script setup lang="ts">
- Component structure order (imports, props, emits, state, computed, watchers, functions, lifecycle)
- Props definition with TypeScript interfaces
- Event emissions with proper typing
- Data-test attributes for testing

### Reactivity Best Practices
- When to use ref() vs reactive()
- Computed properties for derived state
- Avoid unnecessary watchers
- Proper cleanup in onUnmounted()

### State Management (Pinia)
- Store organization
- Typed stores with interfaces
- Actions for mutations
- Getters for computed values

## Backend Standards (Express.js)

### API Design
- RESTful principles
- Route organization
- Controller patterns
- Middleware usage
- Error handling patterns

### Database
- Prisma ORM patterns
- Migration management
- Query optimization
- Transaction handling

### Validation
- Zod schema validation
- Input sanitization
- Error response format

## Smart Contract Standards

### Solidity
- Contract organization
- Function visibility
- Gas optimization
- Security patterns
- Documentation standards (NatSpec)

### Testing
- Comprehensive test coverage (350+ tests)
- TypeScript for test files
- Gas usage reporting

## Testing Requirements

### Test Coverage
- Unit tests: 90% line coverage
- Component tests: 85% line coverage
- Integration tests: 70% line coverage

### Test Organization
- File naming (*.spec.ts, *.integration.spec.ts)
- Test structure (describe blocks)
- Using data-test attributes
- Mock management patterns

### Testing Principles
- Test behavior, not implementation
- Use stable data-test selectors
- Single responsibility per test
- Proper async handling

See [testing-strategy.md](./testing-strategy.md) for comprehensive testing guidelines.

## Web3 Development Standards

### Address Handling
- Always validate with isAddress() from viem
- Use Address type from viem
- Consistent address formatting (lowercase comparison)

### Contract Interactions
- Use useReadContract for reading state
- Use useWriteContract for transactions
- Implement proper error handling
- Use useWaitForTransactionReceipt for confirmations
- Show loading states during operations

### Error Handling
- Comprehensive error handling for blockchain operations
- User-friendly toast notifications
- Console logging for debugging
- Handle network errors gracefully

## Security Standards

### Input Validation
- Validate all user inputs
- Sanitize before display
- Use validation libraries (Zod)
- Validate on both client and server

### Smart Contract Security
- Validate addresses before interactions
- Implement access control checks
- Handle revert reasons gracefully
- Use secure random number generation

See [security.md](./security.md) for comprehensive security guidelines.

## Performance Standards

### Frontend Performance
- Lazy load heavy components
- Use v-show vs v-if appropriately
- Implement v-memo for expensive lists
- Code splitting for routes

### Backend Performance
- API response time targets (see [performance.md](./performance.md))
- Query optimization
- Caching strategies
- Rate limiting

### Bundle Optimization
- Tree shaking
- Dynamic imports
- Asset optimization

## Accessibility Standards

### ARIA Requirements
- Proper ARIA labels for interactive elements
- Semantic HTML
- Keyboard navigation support
- Color contrast requirements

### Testing
- Screen reader compatibility
- Keyboard-only navigation
- WCAG 2.1 compliance

## Documentation Standards

### Code Documentation
- JSDoc for complex functions
- README files for each major component
- API endpoint documentation
- Inline comments for business logic

### Commit Messages
- Follow Conventional Commits format
- Clear, descriptive messages
- Reference issues/PRs

See [commit-conventions.md](../../.github/copilot-instructions/commit-conventions.md) for details.

## Git Workflow

### Branching Strategy
- Main branch: stable production code
- Develop branch: integration branch
- Feature branches: feature/description
- Bugfix branches: fix/description

### Pull Requests
- Clear PR descriptions
- Link to related issues
- Pass all CI checks
- Code review required
- Update documentation if needed

### Commit Practices
- Atomic commits
- Logical grouping
- No WIP commits in main/develop

## Pre-commit Checklist

Before committing code, ensure:
- [ ] Code compiles without TypeScript errors
- [ ] No ESLint errors or warnings
- [ ] Code is formatted with Prettier
- [ ] All tests pass
- [ ] Test coverage meets minimums
- [ ] No console.log in production code
- [ ] Documentation updated if needed
- [ ] Commit message follows conventions

## Code Review Standards

### What Reviewers Check
- Code quality and readability
- Test coverage and quality
- Security considerations
- Performance implications
- Accessibility compliance
- Documentation completeness

### Review Checklist
See [review-checklist.md](../../.github/copilot-instructions/review-checklist.md) for comprehensive checklist.

## Tools and Configuration

### Required Tools
- Node.js v22.18.0+
- TypeScript
- ESLint
- Prettier
- Vitest (testing)
- Playwright (E2E testing)

### IDE Configuration
- VS Code recommended
- ESLint extension
- Prettier extension
- Vue Language Features (Volar)
- TypeScript Vue Plugin

### Pre-commit Hooks
- Husky for git hooks
- lint-staged for staged files
- commitlint for commit messages

## Resources

### Internal Documentation
- [Architecture Overview](./architecture.md)
- [Security Guidelines](./security.md)
- [Performance Standards](./performance.md)
- [Testing Strategy](./testing-strategy.md)
- [Feature Specification Guide](./feature-specification-guide.md)

### External Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vue.js Style Guide](https://vuejs.org/style-guide/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [WCAG Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)

## Enforcement

These standards are enforced through:
- ESLint and TypeScript compilation errors
- Pre-commit hooks
- CI/CD pipeline checks
- Code review process
- Test coverage requirements

## Questions and Exceptions

If you believe a standard should be modified or need an exception:
1. Discuss with the team
2. Document the reasoning
3. Update this document if standard changes
4. Ensure team consensus

---

**Remember**: These standards exist to maintain code quality, readability, and maintainability. They make collaboration easier and reduce technical debt.
```

## Verification

After completion, verify:

```bash
# Check file was created
ls -la /Users/test/Documents/data/gc/cnc-portal/docs/platform/development-standards.md

# Check file length (should be comprehensive, 500-800 lines)
wc -l /Users/test/Documents/data/gc/cnc-portal/docs/platform/development-standards.md

# Verify structure
grep -E '^#{1,3} ' /Users/test/Documents/data/gc/cnc-portal/docs/platform/development-standards.md
```

## Expected Result

- New file created at `/docs/platform/development-standards.md`
- Comprehensive standards covering all aspects of development
- Clear requirements for code quality, testing, security, accessibility
- References to other platform documentation
- Practical examples and checklists
- Enforcement mechanisms documented

## Next Step

After completing this step, proceed to `05-archive-reorganization-summary.md`

## Phase 2 Progress

✅ Steps 1-2 (Phase 1): Critical fixes completed  
✅ Step 3: Deployment documentation created  
✅ Step 4: Development standards created  
⏳ Step 5: Clean up obsolete files (next)
