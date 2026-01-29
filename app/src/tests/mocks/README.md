# Global Mocks System

This directory contains centralized mock definitions that provide consistent testing infrastructure across the application.

## Key Components

- **`query.mock.ts`** - TanStack Query operations (API calls, mutations)
- **`erc20.mock.ts`** - ERC20 token operations (reads, writes, generic factories)
- **`composables.mock.ts`** - Vue composables (auth, contract balance, transactions)
- **`store.mock.ts`** - Pinia stores (team, toast, user, currency)
- **`wagmi.vue.mock.ts`** - Web3 wagmi operations
- **`index.ts`** - Main exports (import from here)

## Quick Usage

```typescript
import { mockERC20Reads, mockERC20Writes, mockToastStore, resetERC20Mocks } from '@/tests/mocks'

beforeEach(() => {
  resetERC20Mocks() // Clean state between tests
})

it('should handle token operations', () => {
  mockERC20Reads.allowance.data.value = 1000n
  mockERC20Writes.approve.executeWrite.mockResolvedValue(undefined)
  // Test component...
})
```

## Philosophy

**"Mock Once, Use Everywhere"** - All mocks are centralized and globally available. Most tests work automatically without any mock setup.

## Complete Documentation

👉 **For comprehensive usage guide, examples, and best practices:**  
**[Global Mock System Documentation](../../../../docs/MOCK_SYSTEM.md)**
