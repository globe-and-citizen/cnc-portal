# ERC20 Mock System Example

## ✅ **Before: Complex Individual Mocks**

```typescript
// ❌ OLD WAY - Each test file needed its own mocks
const { mockUseErc20Allowance, mockUseERC20Approve } = vi.hoisted(() => ({
  mockUseErc20Allowance: vi.fn(),
  mockUseERC20Approve: vi.fn(() => ({
    executeWrite: vi.fn(),
    writeResult: { data: ref(null), error: ref(null) },
    receiptResult: { data: ref(null), error: ref(null) }
  }))
}))

vi.mock('@/composables/erc20/reads', () => ({
  useErc20Allowance: mockUseErc20Allowance
}))

vi.mock('@/composables/erc20/writes', () => ({
  useERC20Approve: mockUseERC20Approve
}))

beforeEach(() => {
  // Manual reset of each mock...
  mockUseErc20Allowance.mockReturnValue({ data: ref(1000000n) })
  mockUseERC20Approve.mockReturnValue({
    executeWrite: vi.fn(),
    writeResult: { data: ref(null), error: ref(null) },
    receiptResult: { data: ref(null), error: ref(null) }
  })
})
```

## ✅ **After: Simple Generic System**

```typescript
// ✅ NEW WAY - Just import and use!
import { mockERC20Reads, mockERC20Writes, resetERC20Mocks } from '@/tests/mocks'

beforeEach(() => {
  resetERC20Mocks() // Reset ALL ERC20 mocks at once
})

it('should handle insufficient allowance', () => {
  mockERC20Reads.allowance.data.value = 0n // Simple!
  // Test logic...
})

it('should handle approval failure', () => {
  mockERC20Writes.approve.writeResult.error.value = new Error('Failed')
  // Test logic...
})
```

## 📊 **Benefits**

- **6 read composables** auto-mocked: `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `allowance`
- **4 write composables** auto-mocked: `transfer`, `transferFrom`, `approve`, `contractWrite`
- **50+ lines of boilerplate** reduced to **2-3 lines**
- **Consistent interface** across all ERC20 operations
- **Reusable everywhere** - no setup needed in individual test files

## 🎯 **Available Mock Objects**

### Read Composables

```typescript
mockERC20Reads.name.data.value // 'Mock Token'
mockERC20Reads.symbol.data.value // 'MTK'
mockERC20Reads.decimals.data.value // 18
mockERC20Reads.balanceOf.data.value // 1000n * 10n ** 18n
mockERC20Reads.allowance.data.value // High allowance by default
mockERC20Reads.totalSupply.data.value // 1000000n * 10n ** 18n

// All include: data, error, isLoading, isSuccess, refetch, etc.
```

### Write Composables

```typescript
mockERC20Writes.approve.executeWrite // Mock function
mockERC20Writes.approve.writeResult.data // Transaction result
mockERC20Writes.approve.writeResult.error // Transaction error
mockERC20Writes.approve.receiptResult.data // Receipt result

mockERC20Writes.transfer.executeWrite // Same structure
mockERC20Writes.transferFrom.executeWrite // Same structure
```

The system automatically handles **ALL** ERC20 composables with zero configuration! 🚀
