import { vi } from 'vitest'
import * as mocks from '@/tests/mocks/wagmi.vue.mock'

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useChainId: mocks.useChainIdFn,
    useReadContract: mocks.useReadContractFn,
    useSignTypedData: mocks.useSignTypedDataFn,
    useWriteContract: mocks.useWriteContractFn,
    useWaitForTransactionReceipt: mocks.useWaitForTransactionReceiptFn,
    useAccount: mocks.useAccountFn,
    useConnection: vi.fn(() => ({ ...mocks.mockUseConnection })),
    useDisconnect: vi.fn(() => ({ ...mocks.mockUseDisconnect })),
    useConnectionEffect: mocks.mockUseConnectionEffect,
    useWatchContractEvent: mocks.mockUseWatchContractEvent,
    useSwitchChain: vi.fn(() => ({ ...mocks.mockUseSwitchChain })),
    createConfig: mocks.mockCreateConfig,
    http: mocks.mockHttp,
    WagmiPlugin: {
      install: vi.fn()
    }
  }
})
// Mock wagmi config before importing main
vi.mock('@/wagmi.config', () => ({
  config: {
    setState: vi.fn(),
    getState: vi.fn(() => ({})),
    getClient: vi.fn(() => ({})),
    subscribe: vi.fn(() => vi.fn()),
    connectors: [],
    chains: [],
    storage: null
  }
}))

vi.mock('@wagmi/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    ...mocks.mockWagmiCore
  }
})
