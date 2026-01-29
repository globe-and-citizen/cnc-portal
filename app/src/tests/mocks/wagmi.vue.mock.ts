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
  signTypedDataAsync: vi.fn(() => console.log('signTypedDataAsync mock called...'))
}

export const mockUseWriteContract = {
  data: transferHash,
  writeContractAsync: vi.fn()
}

// Mock useDisconnect composable
export const mockUseDisconnect = {
  mutate: vi.fn()
}

export const mockWagmiCore = {
  simulateContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  writeContract: vi.fn(),
  readContract: vi.fn()
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

// Mock wagmi config and transport functions
export const mockHttp = vi.fn().mockReturnValue('mocked-http-transport')
export const mockCreateConfig = vi.fn((config) => ({
  chains: config.chains,
  _internal: {
    transports: config.transports
  }
}))
