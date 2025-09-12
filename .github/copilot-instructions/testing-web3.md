# Web3 Testing Patterns

## Web3/Contract Testing Overview

Testing Web3 interactions requires special consideration for blockchain-specific patterns, error handling, and asynchronous operations. This document outlines patterns specific to testing smart contract interactions in the CNC Portal.

## Mock Setup for Web3 Testing

### Wagmi Mocking Pattern

```typescript
// Hoisted mock variables for Web3 functions
const { 
  mockReadContract, 
  mockWriteContract, 
  mockWaitForTransactionReceipt,
  mockUseAccount,
  mockUseBalance
} = vi.hoisted(() => ({
  mockReadContract: vi.fn(),
  mockWriteContract: vi.fn(),
  mockWaitForTransactionReceipt: vi.fn(),
  mockUseAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })),
  mockUseBalance: vi.fn(() => ({
    data: { formatted: '1.0', symbol: 'ETH' },
    isLoading: false
  }))
}))

// Mock wagmi core functions
vi.mock('@wagmi/core', () => ({
  readContract: mockReadContract,
  writeContract: mockWriteContract,
  waitForTransactionReceipt: mockWaitForTransactionReceipt
}))

// Mock wagmi Vue composables
vi.mock('@wagmi/vue', () => ({
  useAccount: mockUseAccount,
  useBalance: mockUseBalance,
  useReadContract: vi.fn(),
  useWriteContract: vi.fn()
}))

// Mock viem utilities
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: vi.fn((address: string) => {
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    }),
    parseEther: vi.fn((value: string) => BigInt(value) * BigInt(10 ** 18)),
    formatEther: vi.fn((value: bigint) => (Number(value) / 10 ** 18).toString())
  }
})
```

### Contract ABI Mocking

```typescript
// Mock contract ABI imports
vi.mock('@/artifacts/abi/CashRemunerationEIP712.json', () => ({
  default: [
    {
      type: 'function',
      name: 'addTokenSupport',
      inputs: [{ name: 'token', type: 'address' }]
    },
    {
      type: 'function',
      name: 'removeTokenSupport',
      inputs: [{ name: 'token', type: 'address' }]
    },
    {
      type: 'function',
      name: 'supportedTokens',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [{ name: '', type: 'bool' }]
    }
  ]
}))
```

## Contract Interaction Testing

### Reading Contract State

```typescript
describe('Contract State Reading', () => {
  it('should check token support correctly', async () => {
    mockReadContract.mockResolvedValue(true)
    wrapper = mountComponent()
    
    await wrapper.vm.checkTokenSupport('0x1234567890123456789012345678901234567890')
    await flushPromises()

    expect(mockReadContract).toHaveBeenCalledWith(
      expect.any(Object), // config
      {
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        abi: expect.any(Array),
        functionName: 'supportedTokens',
        args: ['0x1234567890123456789012345678901234567890']
      }
    )
  })

  it('should handle contract read errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockReadContract.mockRejectedValue(new Error('Contract not found'))
    
    wrapper = mountComponent()
    await wrapper.vm.checkTokenSupport('0x1234567890123456789012345678901234567890')
    await flushPromises()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error checking token support:',
      expect.any(Error)
    )
    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Failed to check token support status'
    )
    
    consoleErrorSpy.mockRestore()
  })
})
```

### Writing to Contracts

```typescript
describe('Contract Write Operations', () => {
  it('should add token support successfully', async () => {
    mockReadContract.mockResolvedValue(false) // Token not supported
    mockWriteContract.mockResolvedValue({
      hash: '0xabcdef...',
      blockNumber: 12345n
    })
    
    wrapper = mountComponent()
    const selectComponent = wrapper.findComponent(SelectComponent)

    await selectComponent.setValue('0x1234567890123456789012345678901234567890')
    await nextTick()
    await flushPromises()

    const button = wrapper.find('[data-test="add-token-button"]')
    await button.trigger('click')
    await flushPromises()

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.any(Object), // config
      {
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        abi: expect.any(Array),
        functionName: 'addTokenSupport',
        args: ['0x1234567890123456789012345678901234567890']
      }
    )

    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
      'Token support added successfully'
    )
  })

  it('should remove token support successfully', async () => {
    mockReadContract.mockResolvedValue(true) // Token is supported
    mockWriteContract.mockResolvedValue({})
    
    wrapper = mountComponent()
    const selectComponent = wrapper.findComponent(SelectComponent)

    await selectComponent.setValue('0x1234567890123456789012345678901234567890')
    await nextTick()
    await flushPromises()

    const button = wrapper.find('[data-test="add-token-button"]')
    await button.trigger('click')
    await flushPromises()

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.any(Object),
      {
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        abi: expect.any(Array),
        functionName: 'removeTokenSupport',
        args: ['0x1234567890123456789012345678901234567890']
      }
    )

    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
      'Token support removed successfully'
    )
  })
})
```

### Transaction State Management

```typescript
describe('Transaction State Management', () => {
  it('should show loading state during transaction', async () => {
    let resolveWriteContract: (value: unknown) => void
    const writeContractPromise = new Promise((resolve) => {
      resolveWriteContract = resolve
    })
    
    mockReadContract.mockResolvedValue(false)
    mockWriteContract.mockReturnValue(writeContractPromise)

    wrapper = mountComponent()
    const selectComponent = wrapper.findComponent(SelectComponent)

    await selectComponent.setValue('0x1234567890123456789012345678901234567890')
    await nextTick()
    await flushPromises()

    const button = wrapper.find('[data-test="add-token-button"]')
    await button.trigger('click')

    // Check loading state
    const buttonComponent = wrapper.findComponent(ButtonUI)
    expect(buttonComponent.props('loading')).toBe(true)
    expect(buttonComponent.props('disabled')).toBe(true)

    resolveWriteContract!({})
    await flushPromises()

    // Check loading state is cleared
    expect(buttonComponent.props('loading')).toBe(false)
  })

  it('should handle transaction confirmation', async () => {
    mockWriteContract.mockResolvedValue({
      hash: '0xabcdef1234567890'
    })
    mockWaitForTransactionReceipt.mockResolvedValue({
      status: 'success',
      blockNumber: 12345n
    })

    wrapper = mountComponent()
    await wrapper.vm.performTransaction()
    await flushPromises()

    expect(mockWaitForTransactionReceipt).toHaveBeenCalledWith(
      expect.any(Object),
      { hash: '0xabcdef1234567890' }
    )
    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
      'Transaction confirmed successfully'
    )
  })
})
```

## Address Validation Testing

```typescript
describe('Address Validation', () => {
  it('should validate Ethereum addresses correctly', () => {
    const validAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0xabcdefABCDEF1234567890123456789012345678'
    ]

    const invalidAddresses = [
      'invalid-address',
      '0x123', // Too short
      '1234567890123456789012345678901234567890', // Missing 0x prefix
      '0xGHIJKL1234567890123456789012345678901234' // Invalid hex characters
    ]

    validAddresses.forEach(address => {
      expect(isAddress(address)).toBe(true)
    })

    invalidAddresses.forEach(address => {
      expect(isAddress(address)).toBe(false)
    })
  })

  it('should not check token support for invalid addresses', async () => {
    wrapper = mountComponent()
    const selectComponent = wrapper.findComponent(SelectComponent)

    await selectComponent.setValue('invalid-address')
    await nextTick()
    await flushPromises()

    expect(mockReadContract).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ButtonUI).props('disabled')).toBe(true)
  })
})
```

## Error Handling Patterns

### Contract Error Types

```typescript
describe('Contract Error Handling', () => {
  it('should handle contract revert errors', async () => {
    const revertError = new Error('Transaction reverted: insufficient funds')
    mockWriteContract.mockRejectedValue(revertError)
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    wrapper = mountComponent()
    
    await wrapper.vm.performTransaction()
    await flushPromises()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error Updating token support:',
      expect.any(Error)
    )
    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Failed to add token support: Transaction reverted: insufficient funds'
    )
    
    consoleErrorSpy.mockRestore()
  })

  it('should handle network errors', async () => {
    const networkError = new Error('Network request failed')
    mockReadContract.mockRejectedValue(networkError)
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    wrapper = mountComponent()
    
    await wrapper.vm.checkTokenSupport('0x1234567890123456789012345678901234567890')
    await flushPromises()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Failed to check token support status'
    )
    
    consoleErrorSpy.mockRestore()
  })

  it('should handle user rejection errors', async () => {
    const userRejectionError = new Error('User rejected the request')
    mockWriteContract.mockRejectedValue(userRejectionError)
    
    wrapper = mountComponent()
    await wrapper.vm.performTransaction()
    await flushPromises()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Transaction was cancelled by user'
    )
  })
})
```

## Gas and Fee Testing

```typescript
describe('Gas and Fee Handling', () => {
  it('should estimate gas for transaction', async () => {
    const mockEstimateGas = vi.fn().mockResolvedValue(21000n)
    
    vi.mock('@wagmi/core', async (importOriginal) => {
      const actual: object = await importOriginal()
      return {
        ...actual,
        estimateGas: mockEstimateGas
      }
    })

    wrapper = mountComponent()
    await wrapper.vm.estimateTransactionGas()

    expect(mockEstimateGas).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        functionName: expect.any(String)
      })
    )
  })

  it('should handle insufficient funds error', async () => {
    const insufficientFundsError = new Error('Insufficient funds for gas')
    mockWriteContract.mockRejectedValue(insufficientFundsError)
    
    wrapper = mountComponent()
    await wrapper.vm.performTransaction()
    await flushPromises()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Insufficient funds for transaction'
    )
  })
})
```

## Multi-step Transaction Testing

```typescript
describe('Multi-step Transactions', () => {
  it('should handle approve and transfer sequence', async () => {
    // First approve
    mockWriteContract
      .mockResolvedValueOnce({ hash: '0xapprove123' })
      .mockResolvedValueOnce({ hash: '0xtransfer456' })
    
    mockWaitForTransactionReceipt
      .mockResolvedValueOnce({ status: 'success' })
      .mockResolvedValueOnce({ status: 'success' })

    wrapper = mountComponent()
    await wrapper.vm.performApproveAndTransfer()
    await flushPromises()

    // Verify approve call
    expect(mockWriteContract).toHaveBeenNthCalledWith(1,
      expect.any(Object),
      expect.objectContaining({
        functionName: 'approve'
      })
    )

    // Verify transfer call
    expect(mockWriteContract).toHaveBeenNthCalledWith(2,
      expect.any(Object),
      expect.objectContaining({
        functionName: 'transfer'
      })
    )

    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
      'Approve and transfer completed successfully'
    )
  })

  it('should handle failure in first step of multi-step transaction', async () => {
    mockWriteContract.mockRejectedValueOnce(new Error('Approve failed'))
    
    wrapper = mountComponent()
    await wrapper.vm.performApproveAndTransfer()
    await flushPromises()

    // Should only attempt approve, not transfer
    expect(mockWriteContract).toHaveBeenCalledTimes(1)
    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Failed to approve token: Approve failed'
    )
  })
})
```

## Contract Event Testing

```typescript
describe('Contract Events', () => {
  it('should listen for contract events', async () => {
    const mockWatchContractEvent = vi.fn()
    
    vi.mock('@wagmi/core', async (importOriginal) => {
      const actual: object = await importOriginal()
      return {
        ...actual,
        watchContractEvent: mockWatchContractEvent
      }
    })

    wrapper = mountComponent()
    await wrapper.vm.startEventListening()

    expect(mockWatchContractEvent).toHaveBeenCalledWith(
      expect.any(Object),
      {
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        abi: expect.any(Array),
        eventName: 'TokenSupportAdded',
        onLogs: expect.any(Function)
      }
    )
  })

  it('should handle contract events correctly', async () => {
    const eventData = {
      args: {
        token: '0x1234567890123456789012345678901234567890',
        added: true
      },
      blockNumber: 12345n
    }

    wrapper = mountComponent()
    wrapper.vm.handleTokenSupportEvent([eventData])
    await nextTick()

    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
      'Token support updated via blockchain event'
    )
  })
})
```

## Balance and Token Testing

```typescript
describe('Balance and Token Operations', () => {
  it('should fetch user balance correctly', async () => {
    mockUseBalance.mockReturnValue({
      data: { 
        formatted: '10.5',
        symbol: 'ETH',
        value: BigInt('10500000000000000000')
      },
      isLoading: false,
      error: null
    })

    wrapper = mountComponent()
    await nextTick()

    expect(wrapper.find('[data-test="balance-display"]').text()).toContain('10.5 ETH')
  })

  it('should handle balance loading state', () => {
    mockUseBalance.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    })

    wrapper = mountComponent()
    
    expect(wrapper.find('[data-test="balance-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="balance-display"]').exists()).toBe(false)
  })

  it('should handle balance fetch errors', () => {
    mockUseBalance.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch balance')
    })

    wrapper = mountComponent()
    
    expect(wrapper.find('[data-test="balance-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="balance-error"]').text()).toContain('Failed to load balance')
  })
})
```

## Wallet Connection Testing

```typescript
describe('Wallet Connection', () => {
  it('should handle connected wallet state', () => {
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      isConnecting: false
    })

    wrapper = mountComponent()
    
    expect(wrapper.find('[data-test="wallet-address"]').text())
      .toContain('0x1234...7890')
    expect(wrapper.find('[data-test="connect-wallet-btn"]').exists()).toBe(false)
  })

  it('should handle disconnected wallet state', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      isConnecting: false
    })

    wrapper = mountComponent()
    
    expect(wrapper.find('[data-test="connect-wallet-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wallet-address"]').exists()).toBe(false)
  })

  it('should handle wallet connecting state', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      isConnecting: true
    })

    wrapper = mountComponent()
    
    expect(wrapper.find('[data-test="connecting-indicator"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="connect-wallet-btn"]').props('loading')).toBe(true)
  })
})
```

## Test Utilities for Web3

```typescript
// Web3-specific test utilities
export const WEB3_TEST_UTILS = {
  // Generate valid test addresses
  generateAddress: (seed = '1234') => `0x${seed.padEnd(40, '0')}`,
  
  // Mock transaction hash
  generateTxHash: () => `0x${'a'.repeat(64)}`,
  
  // Mock block number
  generateBlockNumber: () => BigInt(Math.floor(Math.random() * 1000000)),
  
  // Create mock contract call
  createMockContractCall: (functionName: string, args: any[] = []) => ({
    address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
    abi: expect.any(Array),
    functionName,
    args
  }),
  
  // Expect valid transaction response
  expectValidTransaction: (txResponse: any) => {
    expect(txResponse).toMatchObject({
      hash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/),
      blockNumber: expect.any(BigInt)
    })
  }
}

// Common Web3 test constants
export const WEB3_TEST_CONSTANTS = {
  VALID_ADDRESS: '0x1234567890123456789012345678901234567890',
  INVALID_ADDRESS: 'invalid-address',
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  TEST_TOKEN_ADDRESS: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd',
  MOCK_TX_HASH: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
  MOCK_BLOCK_NUMBER: 12345n
} as const
```
