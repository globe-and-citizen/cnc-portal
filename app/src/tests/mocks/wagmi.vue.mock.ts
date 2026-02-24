import { vi } from 'vitest'
import { ref } from 'vue'

// Shared transfer hash ref for transaction tracking
export const transferHash = ref<string | undefined>(undefined)

export const mockUseReadContract = {
  data: ref('0xData'),
  error: ref(null)
}

export const mockUseSignTypedData = {
  data: ref('0xSignature'),
  signTypedDataAsync: vi.fn(() => console.log('signTypedDataAsync mock called...')),
  mutateAsync: vi.fn().mockResolvedValue('0xSignature')
}

export const mockUseWriteContract = {
  data: transferHash,
  isPending: ref(false),
  error: ref(null),
  isError: ref(false),
  status: ref('idle' as const),
  variables: ref(undefined),
  writeContract: vi.fn(),
  writeContractAsync: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn()
}

// Mock useDisconnect composable
export const mockUseDisconnect = {
  mutate: vi.fn()
}

export const mockWagmiCore = {
  simulateContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  writeContract: vi.fn(),
  readContract: vi.fn(),
  getWalletClient: vi.fn()
}

// Mock useWaitForTransactionReceipt composable
export const mockUseWaitForTransactionReceipt = {
  data: ref(null),
  error: ref(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  isError: ref(false),
  isPending: ref(false),
  status: ref('idle' as const)
}

// Mock useConnection composable
export const mockUseConnection = {
  address: ref('0x1234567890123456789012345678901234567890'),
  status: ref('connected'),
  isConnected: ref(true)
}

// Mock useChainId composable
export const mockUseChainId = ref(1)

// Mock useSwitchChain composable
export const mockUseSwitchChain = {
  mutate: vi.fn(),
  isPending: ref(false)
}

// Mock useConnectionEffect composable
export const mockUseConnectionEffect = vi.fn()

// Mock useWatchContractEvent composable
export const mockUseWatchContractEvent = vi.fn()

// Mock wagmi config and transport functions
export const mockHttp = vi.fn().mockReturnValue('mocked-http-transport')
export const mockCreateConfig = vi.fn((config) => ({
  chains: config.chains,
  _internal: {
    transports: config.transports
  }
}))

/**
 * Mock useAccount composable
 */
export const mockUseAccount = {
  address: ref('0x1234567890123456789012345678901234567890'),
  chainId: ref(1),
  isConnected: ref(true),
  status: ref('connected' as const)
}

/**
 * Exported vi.fn() factory functions for wagmi composables.
 * Use these in tests that need per-test configuration via mockReturnValue/mockReturnValueOnce.
 */
export const useWriteContractFn = vi.fn(() => ({ ...mockUseWriteContract }))
export const useWaitForTransactionReceiptFn = vi.fn(() => ({ ...mockUseWaitForTransactionReceipt }))
export const useChainIdFn = vi.fn(() => mockUseChainId)
export const useReadContractFn = vi.fn(() => ({ ...mockUseReadContract }))
export const useSignTypedDataFn = vi.fn(() => ({ ...mockUseSignTypedData }))
export const useAccountFn = vi.fn(() => ({ ...mockUseAccount }))
