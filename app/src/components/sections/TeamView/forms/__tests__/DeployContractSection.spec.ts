import { describe, it, vi, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ButtonUI from '@/components/ButtonUI.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useWatchContractEvent: vi.fn()
  }
})
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    encodeFunctionData: vi.fn(() => 'EncodedFunctionData')
  }
})
describe('DeployContractSection', () => {
  describe('Rendering', () => {
    it('should render the form correctly', async () => {
      const wrapper = mount(DeployContractSection, {
        props: {
          investorContractInput: {
            name: 'Investor Contract',
            symbol: 'INV'
          },
          createdTeamData: {
            id: '1',
            name: 'Team 1',
            address: '0xTeamAddress'
          }
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })
      const deployButton = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      expect(deployButton.exists()).toBe(true)
      console.log(deployButton.html())
      deployButton.trigger('click')
      // nexttick

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      console.log(wrapper.html())
    })
  })
})
