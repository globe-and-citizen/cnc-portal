# Web3 Integration Guidelines

## Overview

The CNC Portal integrates with Ethereum blockchain for smart contract interactions, wallet connections, and transaction management. This guide covers best practices for Web3 integration using wagmi and viem.

## Web3 Tech Stack

- **Wallet Connection**: wagmi (Vue bindings)
- **Ethereum Client**: viem
- **Smart Contracts**: Hardhat with TypeScript
- **Contract Testing**: Hardhat + ethers.js
- **Network**: Ethereum mainnet, Sepolia testnet, local Hardhat network

## Wallet Connection

### Using wagmi Composables

```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi'

// ✅ Good: Properly handle wallet connection
const { address, isConnected, isConnecting, isDisconnected } = useAccount()
const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
const { disconnect } = useDisconnect()

// Connect to MetaMask
const connectWallet = () => {
  const metaMaskConnector = connectors.find((c) => c.id === 'metaMask')
  if (metaMaskConnector) {
    connect({ connector: metaMaskConnector })
  }
}
```

### Wallet State Management

```typescript
// ✅ Good: Reactive wallet state
import { computed } from 'vue'
import { useAccount } from 'wagmi'

const { address, isConnected } = useAccount()

const walletAddress = computed(() => address.value || null)
const isWalletConnected = computed(() => isConnected.value)

// Short address display
const shortAddress = computed(() => {
  if (!address.value) return ''
  return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
})
```

## Contract Interactions

### Reading Contract Data

```typescript
import { useReadContract } from 'wagmi'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/constant'

// ✅ Good: Type-safe contract read
interface ContractReadResult {
  data: bigint | undefined
  isError: boolean
  isLoading: boolean
  error: Error | null
}

const {
  data: balance,
  isError,
  isLoading,
  error
} = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'balanceOf',
  args: [userAddress]
})

// ✅ Good: Handle loading and error states
const displayBalance = computed(() => {
  if (isLoading.value) return 'Loading...'
  if (isError.value) return 'Error loading balance'
  if (!balance.value) return '0'
  return formatUnits(balance.value, 18)
})
```

### Writing to Contracts

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'

// ✅ Good: Properly handle contract writes
const { writeContract, data: hash, isLoading, isError, error } = useWriteContract()

const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
  hash: hash.value
})

const transferTokens = async (to: string, amount: string) => {
  try {
    await writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'transfer',
      args: [to, parseUnits(amount, 18)]
    })
  } catch (err) {
    console.error('Transfer failed:', err)
    throw err
  }
}

// ✅ Good: Watch for transaction confirmation
watch(isSuccess, (success) => {
  if (success) {
    console.log('Transaction confirmed!')
    // Refresh balances or update UI
  }
})
```

## Transaction Management

### Gas Estimation

```typescript
import { useEstimateGas } from 'wagmi'

// ✅ Good: Estimate gas before transaction
const { data: gasEstimate } = useEstimateGas({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'transfer',
  args: [recipient, amount]
})

const estimatedGasCost = computed(() => {
  if (!gasEstimate.value) return null
  return formatUnits(gasEstimate.value, 9) // gwei
})
```

### Transaction Status Handling

```typescript
// ✅ Good: Comprehensive transaction status handling
const transactionState = ref<'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error'>('idle')

const executeTransaction = async () => {
  try {
    transactionState.value = 'preparing'
    
    const hash = await writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'someFunction',
      args: [arg1, arg2]
    })
    
    transactionState.value = 'pending'
    
    // Wait for confirmation
    const receipt = await waitForTransactionReceipt({
      hash
    })
    
    if (receipt.status === 'success') {
      transactionState.value = 'success'
    } else {
      transactionState.value = 'error'
    }
  } catch (error) {
    transactionState.value = 'error'
    console.error('Transaction failed:', error)
  }
}
```

## Address Validation

### Validate Ethereum Addresses

```typescript
import { isAddress } from 'viem'

// ✅ Good: Validate addresses before use
function validateAddress(address: string): boolean {
  return isAddress(address)
}

// ✅ Good: Type-safe address handling
import type { Address } from 'viem'

function transferTo(recipient: string, amount: bigint) {
  if (!isAddress(recipient)) {
    throw new Error('Invalid recipient address')
  }
  
  // TypeScript now knows recipient is a valid Address
  return writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'transfer',
    args: [recipient as Address, amount]
  })
}
```

## Number Handling

### BigInt and Decimal Conversion

```typescript
import { parseUnits, formatUnits } from 'viem'

// ✅ Good: Convert between user input and blockchain values
function toBlockchainAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals)
}

function fromBlockchainAmount(amount: bigint, decimals: number = 18): string {
  return formatUnits(amount, decimals)
}

// ✅ Good: Handle token decimals
const USDC_DECIMALS = 6
const ETH_DECIMALS = 18

const usdcAmount = parseUnits('100.50', USDC_DECIMALS) // 100500000n
const ethAmount = parseUnits('1.5', ETH_DECIMALS) // 1500000000000000000n
```

### Safe Math Operations

```typescript
// ✅ Good: Safe BigInt arithmetic
const calculateTotal = (amounts: bigint[]): bigint => {
  return amounts.reduce((sum, amount) => sum + amount, 0n)
}

const calculatePercentage = (amount: bigint, percentage: number): bigint => {
  return (amount * BigInt(Math.floor(percentage * 100))) / 10000n
}

// ✅ Good: Prevent division by zero
const calculateRatio = (numerator: bigint, denominator: bigint): bigint => {
  if (denominator === 0n) {
    throw new Error('Division by zero')
  }
  return numerator / denominator
}
```

## Error Handling

### Contract Error Handling

```typescript
// ✅ Good: Parse and handle contract errors
import { BaseError, ContractFunctionRevertedError } from 'viem'

const handleContractError = (error: unknown) => {
  if (error instanceof BaseError) {
    const revertError = error.walk(err => err instanceof ContractFunctionRevertedError)
    
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName ?? ''
      
      // Handle specific contract errors
      switch (errorName) {
        case 'InsufficientBalance':
          return 'Insufficient balance for this transaction'
        case 'TransferFailed':
          return 'Transfer failed. Please try again.'
        default:
          return `Contract error: ${errorName}`
      }
    }
  }
  
  return 'An unexpected error occurred'
}

// Usage in component
const transfer = async () => {
  try {
    await transferTokens(recipient, amount)
  } catch (error) {
    const errorMessage = handleContractError(error)
    addErrorToast(errorMessage)
  }
}
```

### User-Friendly Error Messages

```typescript
// ✅ Good: Map technical errors to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  'user rejected transaction': 'Transaction was cancelled',
  'insufficient funds': 'Insufficient funds to complete transaction',
  'nonce too low': 'Transaction nonce error. Please try again.',
  'gas required exceeds allowance': 'Gas limit too low for this transaction',
  'execution reverted': 'Transaction failed. Please check your inputs.'
}

function getUserFriendlyError(error: Error): string {
  const errorMessage = error.message.toLowerCase()
  
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(key)) {
      return message
    }
  }
  
  return 'Transaction failed. Please try again.'
}
```

## Network Management

### Network Switching

```typescript
import { useSwitchChain } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'

// ✅ Good: Handle network switching
const { switchChain } = useSwitchChain()

const switchToMainnet = async () => {
  try {
    await switchChain({ chainId: mainnet.id })
  } catch (error) {
    console.error('Failed to switch network:', error)
  }
}

// ✅ Good: Network detection
const { chain } = useAccount()

const isCorrectNetwork = computed(() => {
  return chain.value?.id === sepolia.id
})

const networkName = computed(() => {
  return chain.value?.name ?? 'Unknown Network'
})
```

### Network-Specific Contract Addresses

```typescript
// ✅ Good: Environment-specific contract addresses
import { useAccount } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

const CONTRACT_ADDRESSES: Record<number, Address> = {
  [mainnet.id]: '0x...' as Address,
  [sepolia.id]: '0x...' as Address,
  31337: '0x...' as Address // Local Hardhat network
}

const useContractAddress = () => {
  const { chain } = useAccount()
  
  const contractAddress = computed(() => {
    if (!chain.value) return null
    return CONTRACT_ADDRESSES[chain.value.id] ?? null
  })
  
  return { contractAddress }
}
```

## Event Listening

### Watch Contract Events

```typescript
import { useWatchContractEvent } from 'wagmi'

// ✅ Good: Listen to contract events
const { data: transfers } = useWatchContractEvent({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  eventName: 'Transfer',
  onLogs: (logs) => {
    logs.forEach((log) => {
      console.log('Transfer event:', log.args)
      // Update UI or state based on event
    })
  }
})

// ✅ Good: Filter events by parameters
useWatchContractEvent({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  eventName: 'Transfer',
  args: {
    from: userAddress // Only watch transfers from specific address
  },
  onLogs: (logs) => {
    // Handle filtered logs
  }
})
```

## Multicall Pattern

### Batch Contract Reads

```typescript
import { useReadContracts } from 'wagmi'

// ✅ Good: Batch multiple contract reads
const { data, isError, isLoading } = useReadContracts({
  contracts: [
    {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    },
    {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'allowance',
      args: [userAddress, spenderAddress]
    },
    {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'totalSupply'
    }
  ]
})

const [balance, allowance, totalSupply] = computed(() => {
  if (!data.value) return [0n, 0n, 0n]
  return [
    data.value[0]?.result ?? 0n,
    data.value[1]?.result ?? 0n,
    data.value[2]?.result ?? 0n
  ]
})
```

## ENS Support

### Resolve ENS Names

```typescript
import { useEnsName, useEnsAddress } from 'wagmi'

// ✅ Good: Resolve address to ENS name
const { data: ensName } = useEnsName({
  address: userAddress,
  chainId: mainnet.id
})

const displayName = computed(() => {
  return ensName.value || shortAddress.value
})

// ✅ Good: Resolve ENS name to address
const { data: resolvedAddress } = useEnsAddress({
  name: 'vitalik.eth',
  chainId: mainnet.id
})
```

## Security Best Practices

### Input Validation

```typescript
// ✅ Good: Validate all inputs before contract interaction
function validateTransferInputs(recipient: string, amount: string): void {
  if (!isAddress(recipient)) {
    throw new Error('Invalid recipient address')
  }
  
  if (!amount || parseFloat(amount) <= 0) {
    throw new Error('Amount must be greater than 0')
  }
  
  const parsedAmount = parseUnits(amount, 18)
  if (parsedAmount > balance.value) {
    throw new Error('Insufficient balance')
  }
}

const transfer = async (recipient: string, amount: string) => {
  validateTransferInputs(recipient, amount)
  // Proceed with transfer
}
```

### Approve with Care

```typescript
// ✅ Good: Use specific approval amounts instead of max
const approveTokens = async (spender: Address, amount: bigint) => {
  await writeContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount] // Exact amount, not MAX_UINT256
  })
}

// ❌ Bad: Unlimited approval (security risk)
const unsafeApprove = async (spender: Address) => {
  await writeContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')]
  })
}
```

### Signature Verification

```typescript
import { verifyMessage } from 'viem'

// ✅ Good: Verify signed messages
const verifySignature = async (
  address: Address,
  message: string,
  signature: `0x${string}`
): Promise<boolean> => {
  try {
    const recoveredAddress = await verifyMessage({
      address,
      message,
      signature
    })
    return recoveredAddress === address
  } catch {
    return false
  }
}
```

## Performance Optimization

### Debounce Contract Calls

```typescript
import { useDebounceFn } from '@vueuse/core'

// ✅ Good: Debounce frequent contract reads
const debouncedFetchBalance = useDebounceFn(async (address: Address) => {
  const balance = await readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'balanceOf',
    args: [address]
  })
  return balance
}, 500)
```

### Cache Contract Reads

```typescript
// ✅ Good: Use Vue Query for caching
import { useQuery } from '@tanstack/vue-query'

const useTokenBalance = (address: Ref<Address | undefined>) => {
  return useQuery({
    queryKey: ['tokenBalance', address],
    queryFn: async () => {
      if (!address.value) return null
      
      const balance = await readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'balanceOf',
        args: [address.value]
      })
      
      return balance
    },
    staleTime: 10000, // Cache for 10 seconds
    enabled: computed(() => !!address.value)
  })
}
```

## Testing Web3 Components

### Mock Wagmi Composables

```typescript
// ✅ Good: Mock wagmi for testing
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: ref('0x1234567890123456789012345678901234567890'),
    isConnected: ref(true)
  })),
  useReadContract: vi.fn(() => ({
    data: ref(parseUnits('100', 18)),
    isLoading: ref(false),
    isError: ref(false)
  })),
  useWriteContract: vi.fn(() => ({
    writeContract: vi.fn().mockResolvedValue('0xhash'),
    isLoading: ref(false)
  }))
}))
```

## Common Anti-Patterns to Avoid

```typescript
// ❌ Bad: Not checking wallet connection
const transfer = () => {
  writeContract({ ... }) // Will fail if wallet not connected
}

// ✅ Good: Check connection first
const transfer = () => {
  if (!isConnected.value) {
    addErrorToast('Please connect your wallet')
    return
  }
  writeContract({ ... })
}

// ❌ Bad: Hardcoded gas limits
const transfer = () => {
  writeContract({
    ...params,
    gas: 21000n // Hardcoded
  })
}

// ✅ Good: Use gas estimation
const transfer = async () => {
  const estimatedGas = await estimateGas(params)
  writeContract({
    ...params,
    gas: estimatedGas
  })
}

// ❌ Bad: Not handling transaction failures
const transfer = () => {
  writeContract({ ... })
  addSuccessToast('Transfer successful!') // Premature
}

// ✅ Good: Wait for confirmation
const transfer = async () => {
  const hash = await writeContract({ ... })
  const receipt = await waitForTransactionReceipt({ hash })
  if (receipt.status === 'success') {
    addSuccessToast('Transfer successful!')
  }
}
```
