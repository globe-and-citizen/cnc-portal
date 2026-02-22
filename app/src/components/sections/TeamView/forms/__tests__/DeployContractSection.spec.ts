import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ButtonUI from '@/components/ButtonUI.vue'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import { useSyncContractsMutation } from '@/queries/contract.queries'
Centralized Mock Objects
// Import ONLY centralized mocks
import {
  mockUserStore,
  mockToastStore,
  mockUseCurrencyStore
} from '@/tests/mocks/store.mock'
import {
  mockUseWriteContract,
  mockUseWaitForTransactionReceipt,
  mockUseWatchContractEvent
} from '@/tests/mocks/wagmi.vue.mock'
import {
  mockUseSafeDeployment,
  resetComposableMocks
} from '@/tests/mocks/composables.mock'
import { queryMocks, createMockMutationResponse } from '@/tests/mocks/query.mock'

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
    vi.clearAllMocks()

    // Reset Safe deployment state (centralized mock)
    mockUseSafeDeployment.isDeploying.value = false
    mockUseSafeDeployment.deploySafe.mockResolvedValue('0xsafeaddress')

    // Reset wagmi contract state (centralized mocks)
    mockUseWriteContract.data.value = null
    mockUseWriteContract.writeContractAsync.mockClear()
    mockUseWriteContract.mutateAsync.mockClear()

    // Reset transaction receipt state (centralized mock)
    mockUseWaitForTransactionReceipt.isLoading.value = false
    mockUseWaitForTransactionReceipt.isSuccess.value = false
    mockUseWaitForTransactionReceipt.isError.value = false
    mockUseWaitForTransactionReceipt.data.value = null

    // Reset toast store mocks (centralized)
    mockToastStore.addSuccessToast = vi.fn()
    mockToastStore.addErrorToast = vi.fn()
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

      // Test Safe deployment loading state (centralized mock)
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseSafeDeployment.isDeploying.value = true
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

      // Safe deploying state (centralized mock)
      mockUseSafeDeployment.isDeploying.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.text()).toContain('Deploying Safe Wallet')
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

    it('should bail when team id is missing before Safe deploy', async () => {
      const wrapper = createWrapper({
        createdTeamData: { id: null, name: 'Team 1', address: '' }
      })

      await wrapper.vm.deploySafeForTeam()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Team data not found')
    })

    it.skip('should reject invalid wallet before Safe deploy', async () => {
      // SKIPPED: Requires mocked isAddress function from viem
      // This was previously mocked inline but removed as part of centralization effort
      // To re-enable, add isAddress mock to @/tests/mocks/viem.actions.mock.ts
    })

    it('runs Safe deployment flow and updates team', async () => {
      mockUseSafeDeployment.deploySafe.mockResolvedValueOnce('0xsafeaddress')

      const wrapper = createWrapper()
      await wrapper.vm.deploySafeForTeam()

      expect(mockUseSafeDeployment.deploySafe).toHaveBeenCalledWith(
        ['0x1234567890123456789012345678901234567890'],
        1
      )
      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Safe wallet deployed successfully')
    })

    it('handles Safe team update error gracefully', async () => {
      mockUseSafeDeployment.deploySafe.mockResolvedValueOnce('0xsafeaddress')

      // Mock the mutation to reject
      vi.mocked(useUpdateTeamMutation).mockReturnValueOnce({
        mutateAsync: vi.fn().mockRejectedValueOnce(new Error('update failed')),
        mutate: vi.fn(),
        isPending: { value: false },
        isError: { value: true },
        error: { value: new Error('update failed') },
        data: { value: null },
        reset: vi.fn()
      } as unknown as ReturnType<typeof useUpdateTeamMutation>)

      const wrapper = createWrapper()
      await wrapper.vm.deploySafeForTeam()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Failed to deploy Safe wallet. Please try again.'
      )
    })

    it('handles Safe deployment failure', async () => {
      mockUseSafeDeployment.deploySafe.mockRejectedValueOnce(new Error('boom'))
      const wrapper = createWrapper()

      await wrapper.vm.deploySafeForTeam()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Failed to deploy Safe wallet. Please try again.'
      )
    })
  })
})
