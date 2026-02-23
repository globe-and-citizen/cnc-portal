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
  error: ref<Error | null>(null),
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
  getWalletClient: vi.fn(),
  getPublicClient: vi.fn()
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

export const mockUseAccount = {
  address: ref('0x1234567890123456789012345678901234567890'),
  isConnected: ref(true)
}

export const mockUseSignMessage = {
  data: ref<string | undefined>(undefined),
  error: ref<Error | null>(null),
  mutateAsync: vi.fn()
}

export const mockUseConnect = {
  mutate: vi.fn(),
  connectors: [] as unknown,
  error: ref(null)
}

// Mock useChainId composable
export const mockUseChainId = ref(1)

// Mock useSwitchChain composable
export const mockUseSwitchChain = {
  mutate: vi.fn(),
  isPending: ref(false),
  switchChain: vi.fn()
}

// Mock useConnectionEffect composable
export const mockUseConnectionEffect = vi.fn()

// Mock useWatchContractEvent composable
export const mockUseWatchContractEvent = vi.fn()

// Mock useBalance composable
export const mockUseBalance = {
  data: ref<bigint | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

// Mock useSendTransaction composable
export const mockUseSendTransaction = {
  isPending: ref(false),
  error: ref(null),
  data: ref<string>(''),
  sendTransaction: vi.fn()
}

// Mock wagmi config and transport functions
export const mockHttp = vi.fn().mockReturnValue('mocked-http-transport')
export const mockCreateConfig = vi.fn((config) => ({
  chains: config.chains,
  _internal: {
    transports: config.transports
  }
}))
