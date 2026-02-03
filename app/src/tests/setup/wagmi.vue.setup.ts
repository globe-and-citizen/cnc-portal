import { vi } from 'vitest'
import * as mocks from '@/tests/mocks/wagmi.vue.mock'

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useChainId: vi.fn(() => mocks.mockUseChainId),
    useReadContract: vi.fn(() => ({ ...mocks.mockUseReadContract })),
    useSignTypedData: vi.fn(() => ({ ...mocks.mockUseSignTypedData })),
    useWriteContract: vi.fn(() => ({ ...mocks.mockUseWriteContract })),
    useWaitForTransactionReceipt: vi.fn(() => ({ ...mocks.mockUseWaitForTransactionReceipt })),
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
