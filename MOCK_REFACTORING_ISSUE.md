# Refactor Remaining Test Mock Declarations to Centralized Mock System

## Status

✅ **Partially Complete** - Core mock system established, 9 test files migrated  
🔄 **Remaining** - 20+ test files still use inline/local mock declarations

## Background

The CNC Portal test suite previously had mock declarations scattered across individual test files, leading to:

- Code duplication across multiple test files
- Inconsistent mock implementations
- Difficult maintenance and updates
- Complex mock setup logic in test files

## Completed Work

✅ Created centralized mock system in `app/src/tests/mocks/`:

- `store.mock.ts` - All Pinia store mocks
- `wagmi.vue.mock.ts` - @wagmi/vue composable mocks
- `composables.mock.ts` - Custom composable mocks
- Additional mocks for viem, ERC20, elections, bank, BOD, investor, nuxt-ui

✅ Updated setup files in `app/src/tests/setup/`:

- `store.setup.ts` - Registers store mocks globally
- `wagmi.vue.setup.ts` - Registers wagmi mocks globally
- `composables.setup.ts` - Registers composable mocks globally

✅ Fixed test files using centralized mocks:

- WeeklyClaimActionDropdown.spec.ts
- ExpenseAccountTable.spec.ts
- ExpenseAccountTable.actions.spec.ts
- ShowIndex.spec.ts
- user.spec.ts (added `vi.unmock()`)
- useToastStore.spec.ts (added `vi.unmock()`)

✅ Test Results:

- Before: 1406 passed, 14 failed
- After: 1418 passed, 0 failed

## Remaining Work

### Files to Refactor (Priority Order)

#### High Priority (Core Functionality)

1. **TransferModal.spec.ts** - 11 inline mocks
   - @wagmi/vue mocks (useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract)
   - @wagmi/core mocks
   - @tanstack/vue-query mocks
   - @/stores mocks
   - @/composables/bod/writes & reads mocks
   - @/composables mocks
   - @/artifacts/abi/bank mocks
   - @/wagmi.config mocks

2. **useContractBalance.spec.ts** - @wagmi/vue mocks
3. **useContractFunction.spec.ts** - @wagmi/vue and @wagmi/core mocks
4. **useContractWritesV2.spec.ts** - @wagmi/vue, @tanstack/vue-query, @wagmi/core mocks
5. **useContractWritesV2.advanced.spec.ts** - Multiple wagmi, query, and utility mocks

#### Medium Priority (Bank/Composables)

6. **bank-utils.spec.ts** - @/stores and viem mocks
7. **useSiwe.spec.ts** - Partial mocks (check for decommented mocks)
8. **currencyStore.spec.ts** - @tanstack/vue-query mocks

#### Lower Priority (Utilities)

9. **safeDeploymentUtils.spec.ts** - Polymarket builder mocks (may be unique)
10. **useBackendWake.spec.ts** - @/queries/health.queries mocks
11. **useFileUrl.spec.ts** - @vueuse/core and @/constant mocks

### Mock Library Gaps

Some mocks need to be created or expanded:

- [ ] Query mocks (@tanstack/vue-query) - Create `queries.mock.ts`
- [ ] BOD composable mocks - Expand existing or create `bod-composables.mock.ts`
- [ ] Bank utility mocks - Expand `bank.mock.ts`
- [ ] Custom query mocks - Create `health.queries.mock.ts`

## Refactoring Pattern

### Before (Inline Mocks)

```typescript
// TransferModal.spec.ts - BEFORE
const {
  mockWriteContract,
  mockUseChainId,
  // ... many hoisted mocks
} = vi.hoisted(() => ({
  mockWriteContract: vi.fn(),
  mockUseChainId: vi.fn(() => ref(1)),
  // ... all mock implementations inline
}));

vi.mock("@wagmi/vue", () => ({
  useWriteContract: () => ({
    data: ref(null),
    isPending: ref(false),
    writeContractAsync: mockWriteContract,
  }),
  useChainId: mockUseChainId,
  // ...
}));
```

### After (Centralized Mocks)

```typescript
// App/src/tests/mocks/transfer-modal.mock.ts - NEW
export const mockWriteContract = vi.fn();
export const mockUseChainId = vi.fn(() => ref(1));
// ... all mock implementations in shared file

// TransferModal.spec.ts - AFTER
import {
  mockWriteContract,
  mockUseChainId,
} from "@/tests/mocks/transfer-modal.mock";

// Mocks are already registered in setup files, no need for vi.mock() calls
// Just use the centralized mocks directly in tests
```

## Implementation Steps

For each file, follow this pattern:

1. **Identify all mocked modules** - Document which modules are mocked
2. **Create/update mock file** - Add mock exports to appropriate `app/src/tests/mocks/*.mock.ts`
3. **Add setup registration** - Register mocks in `app/src/tests/setup/*.setup.ts` if not already done
4. **Remove inline vi.mock() calls** - Delete mock declarations from test file
5. **Import centralized mocks** - Import mock objects from centralized location
6. **Update test implementations** - Adjust tests to use centralized mocks
7. **Run tests** - Verify all tests still pass: `npm run test:unit`

## Example Refactoring Task

**File**: `TransferModal.spec.ts`

**New Mock File**: `app/src/tests/mocks/transfer-modal.mock.ts`

```typescript
import { vi } from "vitest";
import { ref } from "vue";

export const mockWriteContract = vi.fn();
export const mockWaitForTransactionReceipt = vi.fn();
export const mockUseChainId = vi.fn(() => ref(1));
export const mockUseReadContract = vi.fn();
export const mockUseQueryClient = vi.fn();
export const mockUseToastStore = vi.fn();
export const mockUseUserDataStore = vi.fn();
export const mockUseBodAddAction = vi.fn();
export const mockUseBodIsBodAction = vi.fn();
export const mockUseContractBalance = vi.fn();

// Setup functions for test-specific configurations
export const setupTransferModalMocks = () => {
  mockUseReadContract.mockReturnValue({
    data: ref("0x0987654321098765432109876543210987654321"),
  });
  mockUseQueryClient.mockReturnValue({
    invalidateQueries: vi.fn(),
  });
  // ... more setup
};
```

**Updated Setup File**: `app/src/tests/setup/transfer-modal.setup.ts`

```typescript
import { vi } from "vitest";
import * as mocks from "@/tests/mocks/transfer-modal.mock";

vi.mock("@wagmi/vue", () => ({
  useWriteContract: () => ({
    data: ref(null),
    isPending: ref(false),
    writeContractAsync: mocks.mockWriteContract,
  }),
  // ... remaining mocks using centralized exports
}));
```

**Add to vitest.config.ts setupFiles**:

```typescript
const mockFiles = [
  "store",
  "composables",
  "wagmi.vue",
  "viem",
  "transfer-modal", // NEW
  // ... existing files
].map((name) => `./src/tests/setup/${name}.setup.ts`);
```

## Benefits of Centralized Mocks

✅ **Consistency** - Single source of truth for mock implementations  
✅ **Maintainability** - Update mocks once, affects all tests  
✅ **Reduced Duplication** - Remove duplicate mock code from 6+ files  
✅ **Test Organization** - Clear folder structure for mock management  
✅ **Faster Development** - Reuse mocks across multiple tests  
✅ **Better Documentation** - Mock behavior documented in central location  
✅ **Easier Debugging** - Identify mock issues in one place

## Testing Strategy & Code Quality

### Testing
After each refactor:

```bash
# Run specific test file
npm run test:unit -- TransferModal.spec.ts

# Run all tests to ensure no regressions
npm run test:unit

# Check coverage if needed
npm run test:unit -- --coverage
```

### Code Quality Verification (REQUIRED)
Before committing changes, ensure code quality passes:

```bash
# Type checking - Enforce strict TypeScript
npm run type-check

# Linting - Ensure code style compliance
npm run lint

# Formatting - Ensure consistent formatting
npm run format
```

## Related Documentation

### Mock System Reference
📖 **[CNC Portal Global Mock System](./docs/MOCK_SYSTEM.md)** - Comprehensive guide to the centralized mock system architecture, usage patterns, and troubleshooting

### Testing Standards
- [Vue Component Testing Standards](./copilot-instructions/testing-patterns.md)
- [Vitest Configuration](vitest.config.ts)
- [Mock System Structure](./src/tests/mocks/)

## Notes

- Store tests use `vi.unmock()` to bypass setup mocks for integration testing
- Some mocks (like Polymarket builder) may be unique and should remain test-local
- Consider creating `complex-mocks.mock.ts` for ABI and artifact mocks
- Update this issue as files are completed

---

**Completed by**: Mock System Refactoring Session  
**Start Date**: Feb 2026  
**Target Completion**: Before next major release  
**Status**: In Progress ⏳
