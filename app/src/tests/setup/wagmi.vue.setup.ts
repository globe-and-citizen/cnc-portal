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
    useWriteContract: vi.fn(() => ({ ...mocks.mockUseWriteContract }))
  }
})
