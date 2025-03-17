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
  const defaultProps = {
    investorContractInput: {
      name: 'Investor Contract',
      symbol: 'INV'
    },
    createdTeamData: {
      id: '1',
      name: 'Team 1',
      address: '0xTeamAddress'
    }
  }

  const createWrapper = (props = {}) => {
    return mount(DeployContractSection, {
      props: {
        ...defaultProps,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  describe('Rendering', () => {
    it('should render the form correctly', async () => {
      const wrapper = createWrapper()
      const deployButton = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      expect(deployButton.exists()).toBe(true)
      await deployButton.trigger('click')
      expect(mockUseWriteContract.writeContract).toHaveBeenCalled()
    })

    it('should disable the deploy button when disable prop is true', () => {
      const wrapper = createWrapper({ disable: true })
      const deployButton = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      expect(deployButton.props('disabled')).toBe(true)
    })

    it('should disable the deploy button during loading states', async () => {
      const wrapper = createWrapper()
      const deployButton = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      mockUseWriteContract.isPending.value = true
      await wrapper.vm.$nextTick()
      expect(deployButton.props('disabled')).toBe(true)

      mockUseWriteContract.isPending.value = false
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      expect(deployButton.props('disabled')).toBe(true)
    })
  })

  describe('Contract Deployment', () => {
    it('should handle successful contract deployment', async () => {
      const wrapper = createWrapper()
      const deployButton = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      await deployButton.trigger('click')
      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: expect.any(String),
          functionName: 'createBeaconProxy'
        })
      )
    })
  })
})
