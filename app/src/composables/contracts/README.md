# Contract Writes Composables

This directory contains a generic contract writes system that eliminates code duplication across different contract interactions.

## Architecture

### 1. Generic Base Composable (`useContractWrites`)

The base composable provides all common functionality for contract write operations:

- ✅ **Transaction execution** with `writeContractAsync`
- ✅ **Gas estimation** with encoded function data
- ✅ **Error handling** with toast notifications
- ✅ **Loading states** for pending and confirming transactions
- ✅ **Query invalidation** (customizable per contract)
- ✅ **Transaction validation** before execution

### 2. Contract-Specific Wrappers

Each contract gets its own wrapper that extends the base composable with:

- ✅ **Function name validation** (e.g., Bank functions vs Vesting functions)
- ✅ **Custom query invalidation** based on specific function behaviors
- ✅ **Contract-specific error handling** and validation

## Usage Examples

### Using the Generic Base (for any contract)

```typescript
import { useContractWrites } from '@/composables/contracts'
import MyContractABI from '@/artifacts/abi/MyContract.json'

const contractWrites = useContractWrites({
  contractAddress: '0x1234...', 
  abi: MyContractABI,
  chainId: 1
})

// Execute any function
await contractWrites.executeWrite('myFunction', ['arg1', 'arg2'])

// Estimate gas
const gasNeeded = await contractWrites.estimateGas('myFunction', ['arg1', 'arg2'])

// Check if transaction will succeed
const canExecute = await contractWrites.canExecuteTransaction('myFunction', ['arg1', 'arg2'])
```

### Using Contract-Specific Wrappers

```typescript
import { useBankWrites, useVestingWrites } from '@/composables/contracts'

// Bank contract (with Bank-specific validation and query invalidation)
const bankWrites = useBankWrites()
await bankWrites.executeWrite('transfer', [recipient, amount])

// Vesting contract (with Vesting-specific validation and query invalidation)
const vestingWrites = useVestingWrites()
await vestingWrites.executeWrite('addVesting', [member, amount, duration])
```

## Creating New Contract Wrappers

To create a wrapper for a new contract:

1. **Define function names constants:**

```typescript
export const MY_CONTRACT_FUNCTION_NAMES = {
  MY_FUNCTION: 'myFunction',
  ANOTHER_FUNCTION: 'anotherFunction'
} as const

export type MyContractFunctionName = typeof MY_CONTRACT_FUNCTION_NAMES[keyof typeof MY_CONTRACT_FUNCTION_NAMES]
```

2. **Create the wrapper composable:**

```typescript
import { useContractWrites } from './useContractWrites'
import MyContractABI from '@/artifacts/abi/MyContract.json'

export function useMyContractWrites() {
  const teamStore = useTeamStore()
  const { chainId } = useAccount()
  const contractAddress = computed(() => teamStore.getContractAddressByType('MyContract'))

  const baseWrites = useContractWrites({
    contractAddress: contractAddress.value!,
    abi: MyContractABI,
    chainId: chainId.value
  })

  // Custom query invalidation logic
  const invalidateMyContractQueries = async (functionName: MyContractFunctionName) => {
    // Contract-specific invalidation logic here
  }

  // Wrapper functions with validation
  const executeWrite = async (
    functionName: MyContractFunctionName,
    args: readonly unknown[] = [],
    value?: bigint,
    options?: ContractWriteOptions
  ) => {
    // Add contract-specific validation
    return baseWrites.executeWrite(functionName, args, value, options)
  }

  return {
    ...baseWrites,
    executeWrite,
    invalidateMyContractQueries
  }
}
```

3. **Export from index.ts:**

```typescript
export { useMyContractWrites } from './useMyContractWrites'
```

## Benefits

### ✅ **Code Reuse**

- Common functionality written once
- No duplication across contracts

### ✅ **Consistency**

- Same API pattern for all contracts
- Consistent error handling and loading states

### ✅ **Maintainability**

- Fix bugs in one place
- Add features to all contracts at once

### ✅ **Type Safety**

- Full TypeScript support
- Contract-specific function name validation

### ✅ **Performance**

- Gas estimation prevents failed transactions
- Smart query invalidation reduces unnecessary refetches

## Available Composables

- `useContractWrites` - Generic base composable
- `useBankWrites` - Bank contract wrapper  
- `useVestingWrites` - Vesting contract wrapper

## Migration

Existing code using `useBankWrites` will continue to work unchanged due to backward compatibility exports in `/bank/writes.ts`.
