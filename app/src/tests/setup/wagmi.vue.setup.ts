import { beforeEach, vi } from 'vitest'
import * as mocks from '@/tests/mocks/wagmi.vue.mock'
import { resetContractMocks } from '@/tests/mocks/contract.mock'

// Global web3 reset: restore wagmi state (incl. the shared `transferHash` ref)
// and all V3 contract read/write mocks to defaults before every test. Setup
// `beforeEach` hooks run before spec-level ones, so per-test setup still wins.
beforeEach(() => {
  mocks.resetWagmiVueMocks()
  resetContractMocks()
})

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useChainId: mocks.useChainIdFn,
    useReadContract: mocks.useReadContractFn,
    useSignTypedData: mocks.useSignTypedDataFn,
    useConnection: vi.fn(() => ({ ...mocks.mockUseConnection })),
    useDisconnect: vi.fn(() => ({ ...mocks.mockUseDisconnect })),
    useConnectionEffect: mocks.mockUseConnectionEffect,
    useWatchContractEvent: mocks.mockUseWatchContractEvent,
    useSwitchChain: vi.fn(() => ({ ...mocks.mockUseSwitchChain })),
    useAccount: vi.fn(() => ({ ...mocks.mockUseAccount })),
    useSignMessage: vi.fn(() => ({ ...mocks.mockUseSignMessage })),
    useConnect: vi.fn(() => ({ ...mocks.mockUseConnect })),
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
