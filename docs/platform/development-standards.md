# Development Standards

## Overview

This document establishes code quality standards, best practices, and development guidelines for the CNC Portal project. Following these standards ensures code consistency, maintainability, and collaboration effectiveness across the team.

## Code Quality Standards

### TypeScript Standards

#### Strict Configuration

Always use TypeScript in strict mode:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

#### Type Safety Requirements

- **Never use `any` type** - Use proper typing or `unknown`
- **Define interfaces** for all data structures
- **Use type guards** for runtime type checking
- **Properly type** all function parameters and return values

```typescript
// ❌ Bad: Using 'any'
function processData(data: any) {
  return data.value;
}

// ✅ Good: Proper typing
interface UserData {
  id: number;
  name: string;
  email: string;
}

function processData(data: UserData): string {
  return data.name;
}
```

#### Interface vs Type Usage

- **Use interfaces** for object shapes that may be extended
- **Use types** for unions, intersections, and mapped types
- **Be consistent** within each file/module

```typescript
// Use interface for extensible objects
interface User {
  id: number;
  name: string;
}

interface Admin extends User {
  permissions: string[];
}

// Use type for unions and complex types
type Status = 'pending' | 'approved' | 'rejected';
type Result<T> = { success: true; data: T } | { success: false; error: string };
```

#### Import/Export Conventions

- **Use named imports/exports** over default exports
- **Group imports**: external libraries → internal modules → relative imports
- **Use absolute imports** with path mapping when available

```typescript
// External libraries
import { ref, computed } from 'vue';
import { isAddress } from 'viem';

// Internal modules
import { useTeamStore } from '@/stores';
import type { TeamData } from '@/types';

// Relative imports
import { formatAddress } from './utils';
import type { ComponentProps } from './types';
```

### Code Style

#### ESLint Configuration

All code must pass ESLint validation:

```bash
# Run linting
npm run lint

# Auto-fix issues
npm run lint:fix
```

Key ESLint rules:

- No unused variables
- No console.log in production code
- Proper error handling (no empty catch blocks)
- Consistent quote style (single quotes)
- Semicolons required

#### Prettier Formatting

All code must be formatted with Prettier:

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

#### Naming Conventions

- **camelCase**: variables, functions, methods
- **PascalCase**: classes, interfaces, types, components
- **SCREAMING_SNAKE_CASE**: constants, environment variables
- **kebab-case**: file names, CSS classes

```typescript
// Variables and functions
const userName = 'John';
function getUserData() {}

// Classes and interfaces
class UserManager {}
interface UserData {}
type UserStatus = 'active' | 'inactive';

// Constants
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// Vue components
// File: UserProfile.vue
// Component: <UserProfile />
```

#### File Naming Conventions

- **Components**: `PascalCase.vue` (e.g., `UserProfile.vue`)
- **Utilities**: `camelCase.ts` (e.g., `formatters.ts`)
- **Types**: `types.ts` or `ComponentName.types.ts`
- **Tests**: `ComponentName.spec.ts` or `ComponentName.test.ts`
- **Stores**: `camelCaseStore.ts` (e.g., `userStore.ts`)

### Code Organization

#### File Structure

Each file should follow this structure:

```typescript
// 1. Imports (external → internal → relative)
import { ref } from 'vue';
import { useStore } from '@/stores';
import { helper } from './utils';

// 2. Types and interfaces
interface Props {
  // ...
}

// 3. Constants
const MAX_ITEMS = 10;

// 4. Main code
export function myFunction() {
  // Implementation
}
```

#### Module Organization

- Keep files focused and single-purpose
- Max 400 lines per file (split if longer)
- Group related functionality in folders
- Use index.ts for clean exports

```text
utils/
├── index.ts          # Re-exports everything
├── formatters.ts     # String/number formatting
├── validators.ts     # Validation functions
└── helpers.ts        # General helpers
```

## Frontend Standards (Vue.js)

### Component Standards

Always use **Composition API** with `<script setup lang="ts">`:

```vue
<template>
  <div class="component">
    <!-- Template content -->
  </div>
</template>

<script setup lang="ts">
// Follows standard component structure
// See: .github/copilot-instructions/vue-component-standards.md
</script>

<style scoped>
/* Component styles */
</style>
```

#### Component Structure Order

```typescript
// 1. Imports
import { ref, computed } from 'vue';

// 2. Props and emits
interface Props {
  modelValue: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// 3. Reactive state
const isOpen = ref(false);

// 4. Computed properties
const displayValue = computed(() => /* ... */);

// 5. Watchers
watch(() => props.modelValue, (newValue) => /* ... */);

// 6. Functions/methods
const handleClick = () => { /* ... */ };

// 7. Lifecycle hooks
onMounted(() => { /* ... */ });
```

#### Props Definition

```typescript
// With defaults
interface Props {
  modelValue?: string;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false
});
```

#### Event Emissions

```typescript
const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [data: FormData];
  close: [];
}>();

// Usage
emit('update:modelValue', newValue);
emit('submit', formData);
emit('close');
```

#### Data-Test Attributes

All interactive elements must have `data-test` attributes:

```vue
<template>
  <button data-test="submit-button" @click="handleSubmit">
    Submit
  </button>
  
  <input data-test="email-input" v-model="email" />
  
  <div data-test="error-message" v-if="hasError">
    {{ errorMessage }}
  </div>
</template>
```

### Reactivity Best Practices

```typescript
// Use ref() for primitive values
const count = ref(0);
const message = ref('Hello');

// Use reactive() for objects needing deep reactivity
const user = reactive({
  name: 'John',
  email: 'john@example.com'
});

// Use computed() for derived state
const fullName = computed(() => `${user.firstName} ${user.lastName}`);

// Use shallowRef() for large objects without deep reactivity
const largeDataset = shallowRef([]);
```

### State Management (Pinia)

#### Store Organization

```typescript
// stores/userStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<User | null>(null);
  
  // Getters
  const isAuthenticated = computed(() => currentUser.value !== null);
  
  // Actions
  const setUser = (user: User) => {
    currentUser.value = user;
  };
  
  const logout = () => {
    currentUser.value = null;
  };
  
  return {
    currentUser,
    isAuthenticated,
    setUser,
    logout
  };
});
```

#### Using Stores

Always create store instances inside `setup()` or composables:

```typescript
// ✅ Good
<script setup lang="ts">
const teamStore = useTeamStore();
const currentTeam = computed(() => teamStore.currentTeam);
</script>

// ❌ Bad: Don't access at module top-level
const teamStore = useTeamStore(); // This won't work with SSR
```

## Backend Standards (Express.js)

### API Design

Follow RESTful principles:

```typescript
// GET    /api/v1/teams          - List all teams
// GET    /api/v1/teams/:id      - Get specific team
// POST   /api/v1/teams          - Create team
// PUT    /api/v1/teams/:id      - Update team
// DELETE /api/v1/teams/:id      - Delete team
```

### Route Organization

```typescript
// routes/teams.ts
import { Router } from 'express';
import { TeamController } from '../controllers/TeamController';

const router = Router();
const controller = new TeamController();

router.get('/', controller.getAllTeams);
router.get('/:id', controller.getTeamById);
router.post('/', controller.createTeam);
router.put('/:id', controller.updateTeam);
router.delete('/:id', controller.deleteTeam);

export default router;
```

### Controller Pattern

```typescript
// controllers/TeamController.ts
export class TeamController {
  async getAllTeams(req: Request, res: Response) {
    try {
      const teams = await prisma.team.findMany();
      res.json({ data: teams });
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  }
}
```

### Validation with Zod

```typescript
import { z } from 'zod';

// Define schema
const createTeamSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().optional(),
  memberAddresses: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/))
});

// Validate request
export const validateCreateTeam = (req: Request, res: Response, next: NextFunction) => {
  try {
    createTeamSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid request data', details: error });
  }
};
```

### Database (Prisma)

```typescript
// Good: Use transactions for multiple operations
await prisma.$transaction([
  prisma.team.create({ data: teamData }),
  prisma.member.createMany({ data: memberData })
]);

// Good: Use select to limit returned fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true }
});

// Good: Use proper error handling
try {
  await prisma.team.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    throw new Error('Team name already exists');
  }
  throw error;
}
```

## Smart Contract Standards

### Solidity Best Practices

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyContract
 * @notice Brief description
 * @dev Detailed technical notes
 */
contract MyContract is Ownable {
    // State variables
    uint256 public totalSupply;
    mapping(address => uint256) private balances;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 amount);
    
    // Modifiers
    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }
    
    // Functions (in order: constructor, external, public, internal, private)
    
    constructor() Ownable(msg.sender) {
        totalSupply = 1000000;
    }
    
    /**
     * @notice Transfer tokens
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) 
        external 
        validAddress(to) 
        returns (bool) 
    {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}
```

### Gas Optimization

- Use `uint256` instead of smaller uints (cheaper in most cases)
- Cache storage variables in memory when used multiple times
- Use `calldata` for read-only function parameters
- Batch operations when possible
- Use events for data that doesn't need to be on-chain

### Contract Testing

```typescript
// test/MyContract.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract", function () {
  it("Should transfer tokens correctly", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Contract = await ethers.getContractFactory("MyContract");
    const contract = await Contract.deploy();
    
    await contract.transfer(addr1.address, 100);
    
    expect(await contract.balances(addr1.address)).to.equal(100);
  });
});
```

## Testing Requirements

### Test Coverage

- **Unit tests**: 90% line coverage minimum
- **Component tests**: 85% line coverage minimum
- **Integration tests**: 70% line coverage minimum

See [testing-strategy.md](./testing-strategy.md) for comprehensive guidelines.

### Test Organization

```text
src/
├── components/
│   ├── MyComponent.vue
│   └── __tests__/
│       ├── MyComponent.spec.ts
│       └── MyComponent.advanced.spec.ts
```

### Test Structure

```typescript
describe('ComponentName', () => {
  let wrapper: ReturnType<typeof mount>;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    if (wrapper) wrapper.unmount();
  });
  
  describe('Rendering', () => {
    it('should render with default props', () => {
      wrapper = mount(Component);
      expect(wrapper.exists()).toBe(true);
    });
  });
  
  describe('User Interactions', () => {
    it('should emit event on button click', async () => {
      wrapper = mount(Component);
      await wrapper.find('[data-test="button"]').trigger('click');
      expect(wrapper.emitted('click')).toBeTruthy();
    });
  });
});
```

### Testing Principles

1. **Test behavior, not implementation**
2. **Use data-test attributes** for element selection
3. **Write descriptive test names**
4. **One responsibility per test**
5. **Properly handle async operations**

## Web3 Development Standards

### Address Handling

```typescript
import { isAddress, type Address } from 'viem';

// Always validate addresses
if (!isAddress(userInput)) {
  throw new Error('Invalid Ethereum address');
}

// Use Address type from viem
const recipientAddress: Address = '0x1234567890123456789012345678901234567890';

// Consistent formatting (lowercase for comparison)
const normalized = address.toLowerCase();
```

### Contract Interactions

```typescript
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue';

// Reading contract state
const { data: tokenSupport, isLoading } = useReadContract({
  address: contractAddress,
  abi: contractABI,
  functionName: 'supportedTokens',
  args: [tokenAddress]
});

// Writing to contract
const { writeContract, data: hash } = useWriteContract();

const handleAddToken = async () => {
  try {
    await writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'addTokenSupport',
      args: [tokenAddress]
    });
    
    // Wait for confirmation
    const receipt = await useWaitForTransactionReceipt({ hash });
    
    addSuccessToast('Token added successfully');
  } catch (error) {
    console.error('Error adding token:', error);
    addErrorToast('Failed to add token');
  }
};
```

### Error Handling

```typescript
// Comprehensive blockchain error handling
try {
  await writeContract({ /* ... */ });
} catch (error: any) {
  if (error.message.includes('User rejected')) {
    addErrorToast('Transaction was cancelled');
  } else if (error.message.includes('insufficient funds')) {
    addErrorToast('Insufficient funds for transaction');
  } else if (error.message.includes('network')) {
    addErrorToast('Network error. Please try again');
  } else {
    console.error('Blockchain error:', error);
    addErrorToast('Transaction failed. Please try again');
  }
}
```

## Security Standards

### Input Validation

```typescript
// Client-side validation
const emailSchema = z.string().email();
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

// Server-side validation (ALWAYS validate on server)
export const validateUser = z.object({
  email: z.string().email(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  name: z.string().min(2).max(50)
});
```

### XSS Prevention

```typescript
// ✅ Good: Vue automatically escapes
<template>
  <div>{{ userInput }}</div>  <!-- Safe -->
</template>

// ⚠️ Dangerous: Only use v-html with trusted content
<template>
  <div v-html="trustedHTML"></div>  <!-- Only if sanitized! -->
</template>
```

### Smart Contract Security

```solidity
// Access control
modifier onlyBoardMember() {
    require(boardOfDirectors.isBoardMember(msg.sender), "Unauthorized");
    _;
}

// Reentrancy protection
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MyContract is ReentrancyGuard {
    function withdraw() external nonReentrant {
        // Safe from reentrancy
    }
}

// Input validation
require(amount > 0, "Amount must be positive");
require(recipient != address(0), "Invalid recipient");
```

See [security.md](./security.md) for comprehensive security guidelines.

## Performance Standards

### Frontend Performance

```typescript
// Lazy load heavy components
const HeavyComponent = defineAsyncComponent(
  () => import('./HeavyComponent.vue')
);

// Use v-show for frequently toggled elements
<div v-show="isVisible">Content</div>

// Use v-if for rarely changing elements
<div v-if="shouldRender">Content</div>

// Use v-memo for expensive lists
<div v-for="item in list" :key="item.id" v-memo="[item.id, item.updatedAt]">
  {{ expensiveComputation(item) }}
</div>
```

### Backend Performance

```typescript
// Query optimization
const users = await prisma.user.findMany({
  select: { id: true, name: true }, // Only fetch needed fields
  take: 10, // Limit results
  skip: offset, // Pagination
  where: { active: true } // Filter in database
});

// Caching
import { Redis } from 'ioredis';
const redis = new Redis();

const getCachedUser = async (id: string) => {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  
  const user = await prisma.user.findUnique({ where: { id } });
  await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);
  return user;
};
```

See [performance.md](./performance.md) for detailed performance standards.

## Accessibility Standards

### ARIA Requirements

```vue
<template>
  <button
    data-test="dropdown-trigger"
    :aria-expanded="isOpen"
    aria-haspopup="true"
    :aria-label="buttonLabel"
    role="button"
    tabindex="0"
    @click="toggleDropdown"
    @keydown.enter="toggleDropdown"
    @keydown.space.prevent="toggleDropdown"
    @keydown.escape="closeDropdown"
  >
    {{ displayText }}
  </button>
</template>
```

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Support Tab, Enter, Space, Escape, Arrow keys where appropriate
- Visible focus indicators required
- Skip links for main content

### WCAG 2.1 Compliance

- Level AA minimum
- Color contrast ratio: 4.5:1 for text
- Alternative text for images
- Semantic HTML structure
- Form labels and error messages

## Documentation Standards

### Code Documentation

```typescript
/**
 * Calculates the total amount including tax
 * 
 * @param amount - The base amount before tax
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @returns The total amount including tax
 * 
 * @example
 * ```typescript
 * const total = calculateWithTax(100, 0.1);
 * // Returns: 110
 * ```
 */
function calculateWithTax(amount: number, taxRate: number): number {
  return amount * (1 + taxRate);
}
```

### Component Documentation

```vue
<!--
@component UserProfile
@description Displays user profile information with edit capabilities

@prop {User} user - The user object to display
@prop {boolean} [editable=false] - Whether the profile can be edited

@emits update:user - Emitted when user data is updated
@emits delete - Emitted when user requests account deletion

@example
<UserProfile :user="currentUser" :editable="true" @update:user="handleUpdate" />
-->
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(components): add token selection dropdown
fix(api): handle network errors gracefully
docs(readme): update installation instructions
refactor(utils): extract validation logic
test(components): add UserProfile tests
chore(deps): update dependencies
```

See [commit-conventions.md](../../.github/copilot-instructions/commit-conventions.md) for details.

## Git Workflow

### Branching Strategy

- **`main`**: Stable production code
- **`develop`**: Integration branch for features
- **`feature/*`**: New features (e.g., `feature/user-auth`)
- **`fix/*`**: Bug fixes (e.g., `fix/login-error`)
- **`hotfix/*`**: Urgent production fixes

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes following standards
3. Write/update tests
4. Ensure all tests pass
5. Create PR with clear description
6. Link related issues
7. Address review feedback
8. Merge after approval

### Commit Practices

- Write clear, descriptive commit messages
- Make atomic commits (one logical change per commit)
- Don't commit WIP to main/develop
- Reference issues in commits: `fixes #123`

## Pre-commit Checklist

Before committing code:

- [ ] Code compiles without TypeScript errors
- [ ] No ESLint errors or warnings
- [ ] Code is formatted with Prettier
- [ ] All tests pass locally
- [ ] Test coverage meets minimums
- [ ] No console.log in production code
- [ ] data-test attributes added for new interactive elements
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

- **Node.js** v22.18.0+
- **TypeScript** 5.0+
- **ESLint** with project config
- **Prettier** with project config
- **Vitest** for testing
- **Playwright** for E2E testing

### IDE Configuration

**VS Code** (recommended):

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

**Required Extensions**:

- ESLint
- Prettier
- Vue Language Features (Volar)
- TypeScript Vue Plugin

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,vue}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ]
  }
}
```

## Resources

### Internal Documentation

- [Architecture Overview](./architecture.md)
- [Security Guidelines](./security.md)
- [Performance Standards](./performance.md)
- [Testing Strategy](./testing-strategy.md)
- [Feature Specification Guide](./feature-specification-guide.md)
- [Deployment Guide](./deployment.md)

### Coding Guidelines

- [Vue Component Standards](../../.github/copilot-instructions/vue-component-standards.md)
- [TypeScript Guidelines](../../.github/copilot-instructions/typescript-guidelines.md)
- [Web3 Integration](../../.github/copilot-instructions/web3-integration.md)
- [Testing Patterns](../../.github/copilot-instructions/testing-patterns.md)

### External Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vue.js Style Guide](https://vuejs.org/style-guide/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [WCAG Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Solidity Best Practices](https://consensys.github.io/smart-contract-best-practices/)

## Enforcement

These standards are enforced through:

- ESLint and TypeScript compilation errors
- Pre-commit hooks
- CI/CD pipeline checks
- Code review process
- Test coverage requirements
- Automated deployment gates

## Questions and Exceptions

If you believe a standard should be modified or need an exception:

1. Discuss with the team
2. Document the reasoning
3. Update this document if standard changes
4. Ensure team consensus

---

**Remember**: These standards exist to maintain code quality, readability, and maintainability. They make collaboration easier and reduce technical debt. When in doubt, follow the standards. When standards are unclear, ask the team.

---

**Last Updated:** December 7, 2025  
**Maintained by:** CNC Portal Development Team
