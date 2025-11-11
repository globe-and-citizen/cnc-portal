import { vi } from 'vitest'
import * as mocks from '@/tests/mocks/wagmi.vue.mock'
import { ref } from 'vue'

console.log('🟢 GLOBAL WAGMI SETUP FILE EXECUTING') // You should see this

vi.mock('@wagmi/vue', async (importOriginal) => {
  console.log('🟢 GLOBAL WAGMI MOCK SETUP') // You should see this too

  const actual: object = await importOriginal()
  return {
    ...actual,
    useChainId: vi.fn(() => ref(1)),
    useReadContract: vi.fn(() => ({ ...mocks.mockUseReadContract })),
    useSignTypedData: vi.fn(() => {
      console.log('🟢 MOCKED WAGMI FUNCTION EXECUTED')
      return { ...mocks.mockUseSignTypedData }
    })
  }
})
