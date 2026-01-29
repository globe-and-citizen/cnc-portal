import { vi } from 'vitest'
import * as mocks from '@/tests/mocks/wagmi.vue.mock'
import { ref } from 'vue'

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useChainId: vi.fn(() => ref(1)),
    useReadContract: vi.fn(() => ({ ...mocks.mockUseReadContract })),
    useSignTypedData: vi.fn(() => ({ ...mocks.mockUseSignTypedData })),
    useWriteContract: vi.fn(() => ({ ...mocks.mockUseWriteContract })),
    useWaitForTransactionReceipt: vi.fn(() => ({
      data: ref(null),
      error: ref(null),
      isLoading: ref(false),
      isSuccess: ref(false),
      isError: ref(false),
      isPending: ref(false),
      status: ref('idle' as const)
    })),
    useConnection: vi.fn(() => ({
      address: ref('0x1234567890123456789012345678901234567890'),
      status: ref('connected'),
      isConnected: ref(true)
    })),
    useConnectionEffect: vi.fn(),
    useSwitchChain: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: ref(false)
    }))
  }
})

vi.mock('@wagmi/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    ...mocks.mockWagmiCore
  }
})
