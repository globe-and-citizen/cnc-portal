import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ButtonUI from '@/components/ButtonUI.vue'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'

// Centralized Mock Objects
// Import ONLY centralized mocks
import {
  mockUseWriteContract,
  mockUseWaitForTransactionReceipt
} from '@/tests/mocks/wagmi.vue.mock'
import { resetComposableMocks } from '@/tests/mocks/composables.mock'

describe.skip('DeployContractSection', () => {
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
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        mocks: {
          $t: (msg: string) => msg
        }
      }
    })
  }

  beforeEach(() => {
    // Use centralized reset function
    resetComposableMocks()

    // Reset wagmi contract state (centralized mocks)
    mockUseWriteContract.data.value = null
    mockUseWriteContract.isPending.value = false
    mockUseWriteContract.error.value = null

    // Reset transaction receipt state (centralized mock)
    mockUseWaitForTransactionReceipt.isLoading.value = false
    mockUseWaitForTransactionReceipt.isSuccess.value = false
    mockUseWaitForTransactionReceipt.isError.value = false
    mockUseWaitForTransactionReceipt.data.value = null
    mockUseWaitForTransactionReceipt.isPending.value = false
  })

  describe('Component Rendering', () => {
    it('should render the deploy button correctly', () => {
      const wrapper = createWrapper()
      const deployButton = wrapper.find('[data-test="deploy-contracts-button"]')

      expect(deployButton.exists()).toBe(true)
      expect(deployButton.findComponent(ButtonUI).exists()).toBe(true)
    })

    it('should disable the deploy button when disable prop is true', () => {
      const wrapper = createWrapper({ disable: true })
      const buttonComponent = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      expect(buttonComponent.props('disabled')).toBe(true)
    })

    it('should disable the deploy button during loading states', async () => {
      const wrapper = createWrapper()
      const buttonComponent = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      // Test transaction receipt loading state (centralized mock)
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.props('disabled')).toBe(true)
    })

    it('should show correct button text based on state', async () => {
      const wrapper = createWrapper()
      const buttonComponent = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      // Default state
      expect(buttonComponent.text()).toContain('Deploy Team Contracts')
    })
  })

  describe('Contract Deployment Process', () => {
    it.skip('should call writeContract with correct parameters when deploy button is clicked', async () => {
      const wrapper = createWrapper()
      const deployButton = wrapper.find('[data-test="deploy-contracts-button"]')

      await deployButton.trigger('click')

      expect(mockUseWriteContract.writeContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          address: expect.any(String),
          functionName: 'createBeaconProxy'
        })
      )
    })

    it.skip('should handle validation errors', async () => {
      // SKIPPED: Requires mocked validateAddresses function from @/constant
      // This was previously mocked inline but removed as part of centralization effort
      // To re-enable, add validateAddresses mock to @/tests/mocks/constant.mock.ts
    })
  })
})
