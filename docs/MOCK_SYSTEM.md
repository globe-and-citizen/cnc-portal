# CNC Portal Global Mock System

## Overview

The CNC Portal has a comprehensive centralized mock system that provides consistent, maintainable testing infrastructure. The system covers:

- **TanStack Query Operations** - All API queries and mutations
- **Web3/Blockchain Interactions** - ERC20 tokens, contract operations, wagmi
- **Vue Composables** - Authentication, contract balances, transactions
- **Pinia Stores** - Team store, toast notifications, etc.
- **External Services** - Backend health checks, Safe wallet operations

## Architecture Overview

The mock system is organized into specialized modules:

```txt
src/tests/
├── mocks/
│   ├── index.ts              # Main export file
│   ├── query.mock.ts         # TanStack Query mocks
│   ├── erc20.mock.ts         # ERC20 token operations
│   ├── composables.mock.ts   # Vue composables
│   ├── store.mock.ts         # Pinia stores
│   └── wagmi.vue.mock.ts     # Web3 wagmi mocks
└── setup/
    └── composables.setup.ts  # Global mock registration
    └── erc20.setup.ts       # ERC20 mock setup
    └── store.setup.ts       # Store mock setup
    └── wagmi.vue.setup.ts   # Web3 wagmi mock setup
```

## Key Benefits

✅ **"Mock Once, Use Everywhere"** - Centralized definitions, zero per-test setup  
✅ **Type Safety** - Full TypeScript support with proper typing  
✅ **Comprehensive Coverage** - Web3, API, composables, stores all covered  
✅ **Easy Overrides** - Simple per-test customization when needed  
✅ **Reset Functions** - Clean state between tests  
✅ **Generic Factories** - Reusable patterns for common scenarios

## Mock System Components

### 1. TanStack Query Mocks (`query.mock.ts`)

Handles all API operations with realistic data:

```typescript
// Factory functions
createMockQueryResponse<T>(data, isLoading, error);
createMockMutationResponse();

// Pre-configured data
(mockTeamData, mockTeamsData, mockWageData, mockNotificationData);

// Complete query mock object
export const queryMocks = {
  useTeamsQuery: () => createMockQueryResponse(mockTeamsData),
  useCreateTeamMutation: () => createMockMutationResponse(),
  // ... 20+ more query/mutation mocks
};
```

### 2. ERC20 Token Mocks (`erc20.mock.ts`)

Generic factories for all ERC20 operations:

```typescript
// Generic factories
createERC20ReadMock<T>(defaultValue); // For read operations
createERC20WriteMock(); // For write operations

// Pre-configured instances
mockERC20Reads = {
  name: createERC20ReadMock("Mock Token"),
  symbol: createERC20ReadMock("MTK"),
  decimals: createERC20ReadMock(18),
  balanceOf: createERC20ReadMock(1000n * 10n ** 18n),
  allowance: createERC20ReadMock(1000000n * 10n ** 18n),
};

mockERC20Writes = {
  transfer: createERC20WriteMock(),
  approve: createERC20WriteMock(),
  transferFrom: createERC20WriteMock(),
};
```

### 3. Composable Mocks (`composables.mock.ts`)

Core application composables:

```typescript
mockUseAuth = { logout: vi.fn(), login: vi.fn(), validateToken: vi.fn() }
mockUseContractBalance = { balances: ref([...]), total: ref({...}) }
mockUseSafeSendTransaction = { sendTransaction: vi.fn(), isLoading: ref(false) }
mockUseBackendWake = vi.fn()
```

### 4. Store Mocks (`store.mock.ts`)

Pinia store implementations:

```typescript
mockTeamStore = {
  currentTeam: ref(null),
  getContractAddressByType: vi.fn(),
  // ... complete store interface
};

mockToastStore = {
  addSuccessToast: vi.fn(),
  addErrorToast: vi.fn(),
  addInfoToast: vi.fn(),
};
```

### 5. Reset Functions

Clean state management:

```typescript
resetERC20Mocks(); // Reset all ERC20 token mocks
resetComposableMocks(); // Reset composable states
resetQueryMocks(); // Reset query states
```

## Using the Mock System

### 1. Zero-Setup Testing (Most Common)

Just import and test - all mocks are automatically active:

```typescript
import { mount } from "@vue/test-utils";
import MyComponent from "@/components/MyComponent.vue";
import { createTestingPinia } from "@pinia/testing";

describe("MyComponent", () => {
  it("should work with all mocks active", () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });

    // All systems automatically mocked:
    // - TanStack queries return mock data
    // - ERC20 operations have realistic responses
    // - Stores provide mock implementations
    // - Composables return predictable values
    expect(wrapper.exists()).toBe(true);
  });
});
```

### 2. Using Centralized Mock Objects

Access pre-configured mocks directly:

```typescript
import { mockERC20Reads, mockERC20Writes, mockTeamStore } from "@/tests/mocks";

it("should handle ERC20 operations", () => {
  // Set specific token balance
  mockERC20Reads.balanceOf.data.value = 500n * 10n ** 18n;

  // Simulate approval error
  mockERC20Writes.approve.writeResult.error.value = new Error(
    "Insufficient gas",
  );

  // Set team context
  mockTeamStore.currentTeam.value = { id: "1", name: "Test Team" };

  // Test component with these states
});
```

### 3. Override Specific Mocks When Needed

```typescript
import { useTeamsQuery } from "@/queries/team.queries";
import { createMockQueryResponse } from "@/tests/mocks";

it("should handle custom data", () => {
  const customTeams = [{ id: "999", name: "Special Team" }];

  vi.mocked(useTeamsQuery).mockReturnValueOnce(
    createMockQueryResponse(customTeams),
  );

  // Test with custom data
});
```

### 4. Reset Between Tests

```typescript
import { resetERC20Mocks, resetComposableMocks } from "@/tests/mocks";

beforeEach(() => {
  resetERC20Mocks(); // Clean ERC20 state
  resetComposableMocks(); // Clean composable state
  vi.clearAllMocks(); // Clean all mock calls
});
```

### 5. Comprehensive Testing Examples

#### API Query Testing

```typescript
import { useTeamsQuery } from "@/queries/team.queries";
import { createMockQueryResponse } from "@/tests/mocks";

// Test loading state
it("should show loading spinner", () => {
  vi.mocked(useTeamsQuery).mockReturnValueOnce(
    createMockQueryResponse([], true), // isLoading = true
  );

  expect(wrapper.find('[data-test="loading"]').exists()).toBe(true);
});

// Test error state
it("should show error message", () => {
  vi.mocked(useTeamsQuery).mockReturnValueOnce(
    createMockQueryResponse(null, false, new Error("Network failed")),
  );

  expect(wrapper.find('[data-test="error"]').exists()).toBe(true);
});
```

#### ERC20 Token Testing

```typescript
import {
  mockERC20Reads,
  mockERC20Writes,
  resetERC20Mocks,
} from "@/tests/mocks";

beforeEach(() => {
  resetERC20Mocks(); // Start with clean state
});

it("should handle insufficient allowance", () => {
  mockERC20Reads.allowance.data.value = 0n; // No allowance

  // Component should show approval needed
  expect(wrapper.find('[data-test="needs-approval"]').exists()).toBe(true);
});

it("should handle transfer failure", () => {
  mockERC20Writes.transfer.writeResult.error.value = new Error(
    "Transfer failed",
  );

  // Component should show error state
  expect(wrapper.find('[data-test="transfer-error"]').exists()).toBe(true);
});
```

#### Store Integration Testing

```typescript
import { mockTeamStore, mockToastStore } from "@/tests/mocks";

it("should use team context", () => {
  mockTeamStore.currentTeam.value = {
    id: "1",
    name: "Development Team",
    contracts: [{ address: "0x123...", type: "InvestorV1" }],
  };

  expect(wrapper.find('[data-test="team-name"]').text()).toBe(
    "Development Team",
  );
});

it("should show success notification", async () => {
  await wrapper.find('[data-test="submit-btn"]').trigger("click");

  expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
    "Operation completed successfully",
  );
});
```

#### Web3/Blockchain Testing

```typescript
import {
  mockUseSafeSendTransaction,
  mockTransactionFunctions,
} from "@/tests/mocks";

it("should send blockchain transaction", async () => {
  mockTransactionFunctions.mockSendTransaction.mockResolvedValue({
    hash: "0xabcdef123456789",
  });

  await wrapper.find('[data-test="send-tx-btn"]').trigger("click");

  expect(mockTransactionFunctions.mockSendTransaction).toHaveBeenCalledWith(
    expect.objectContaining({
      to: "0x1234567890123456789012345678901234567890",
      value: expect.any(String),
    }),
  );
});
```

## Adding New Mocks

The system is designed for easy extension. Here's how to add different types of mocks:

### Adding New Query Mocks

1. **Add mock data** (`query.mock.ts`):

```typescript
export const mockMyNewData: MyType = {
  /* realistic data */
};
```

2. **Add to queryMocks object** (`query.mock.ts`):

```typescript
export const queryMocks = {
  // ... existing mocks
  useMyNewQuery: () => createMockQueryResponse(mockMyNewData),
  useMyNewMutation: () => createMockMutationResponse(),
};
```

3. **Register globally** (`composables.setup.ts`):

```typescript
vi.mock("@/queries/mynew.queries", () => ({
  useMyNewQuery: vi.fn(queryMocks.useMyNewQuery),
  useMyNewMutation: vi.fn(queryMocks.useMyNewMutation),
}));
```

### Adding New Composable Mocks

1. **Create mock implementation** (`composables.mock.ts`):

```typescript
export const mockUseMyComposable = {
  someMethod: vi.fn(),
  someState: ref("default-value"),
  isLoading: ref(false),
};
```

2. **Add reset logic** (`composables.mock.ts`):

```typescript
export const resetComposableMocks = () => {
  // ... existing resets
  mockUseMyComposable.isLoading.value = false;
  mockUseMyComposable.someState.value = "default-value";
  if (vi.isMockFunction(mockUseMyComposable.someMethod)) {
    mockUseMyComposable.someMethod.mockClear();
  }
};
```

3. **Register globally** (`composables.setup.ts`):

```typescript
vi.mock("@/composables/useMyComposable", () => ({
  useMyComposable: vi.fn(() => mockUseMyComposable),
}));
```

### Adding New Store Mocks

1. **Create store mock** (`store.mock.ts`):

```typescript
export const mockMyStore = {
  someState: ref("initial"),
  someGetter: computed(() => "computed-value"),
  someAction: vi.fn(),
  // ... complete store interface
};
```

2. **Export for global usage** (`index.ts`):

```typescript
export * from "./store.mock";
```

## File Structure

```
src/tests/
├── mocks/
│   ├── index.ts                  # Main exports (import from here)
│   ├── query.mock.ts            # TanStack Query operations
│   ├── erc20.mock.ts             # ERC20 token operations
│   ├── composables.mock.ts       # Vue composables
│   ├── store.mock.ts             # Pinia stores
│   ├── wagmi.vue.mock.ts         # Web3 wagmi operations
│   └── README.md                 # Quick reference guide
└── setup/
    └── composables.setup.ts      # Global mock registration
```

## Common Troubleshooting

**Q: Tests failing with "Cannot read property of undefined"**  
A: Ensure you're calling the appropriate reset function in `beforeEach()`

**Q: Mock not being applied to my test**  
A: Check that the mock is registered in `composables.setup.ts` and the module path is correct

**Q: TypeScript errors with mock overrides**  
A: Use `vi.mocked()` helper: `vi.mocked(useMyQuery).mockReturnValue(...)`

**Q: ERC20 operations not working in tests**  
A: Import and call `resetERC20Mocks()` in your test setup

**Q: Need to test with different contract addresses**  
A: Override `mockTeamStore.getContractAddressByType()` with your test addresses

**Q: Store not returning expected data**  
A: Set the store state directly: `mockTeamStore.currentTeam.value = myTestTeam`

## Benefits Summary

This comprehensive mock system provides:

🎯 **Zero Configuration Testing** - Just write tests, mocks are automatic  
🔄 **Consistent Data** - Same realistic data across all tests  
🧩 **Modular Design** - Different mock types for different concerns  
⚡ **High Performance** - Pre-configured mocks, minimal setup overhead  
🛡️ **Type Safety** - Full TypeScript support throughout  
🔧 **Easy Maintenance** - Centralized definitions, easy updates  
📚 **Great DX** - Simple imports, predictable behavior  
🎨 **Flexible Overrides** - Easy customization when needed

## Quick Start Checklist

1. ✅ Import component and mount normally
2. ✅ Add reset functions to `beforeEach()` if needed
3. ✅ Override specific mocks only when necessary
4. ✅ Use `data-test` attributes for element selection
5. ✅ Test both success and error scenarios
6. ✅ Verify mock interactions with `expect().toHaveBeenCalledWith()`

**Ready to test? Just start writing - the mocks are already there! 🚀**
