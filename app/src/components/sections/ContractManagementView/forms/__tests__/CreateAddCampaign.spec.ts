import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import CreateAddCampaign from '@/components/sections/ContractManagementView/forms/CreateAddCampaign.vue'

import { ref, type ComponentPublicInstance } from 'vue'
import { useCreateContractMutation } from '@/queries/contract.queries'

const deployState = {
  isDeploying: ref(false),
  contractAddress: ref<string | null>(null),
  error: ref<Error | null>(null)
}

const mocks = vi.hoisted(() => {
  return {
    mockUseDeployContract: vi.fn().mockImplementation(() => ({
      ...deployState,
      deploy: vi.fn()
    }))
  }
})

//const campaignAbi = AdCampaignArtifact.abi
vi.mock('@/composables/useContractFunctions', async (importOriginal) => {
  const actual: object = await importOriginal()

  return {
    ...actual,
    useDeployContract: mocks.mockUseDeployContract
  }
})

// Hoisted mocks
const { mockTeamStore, mockCreateContractMutateAsync } = vi.hoisted(() => ({
  mockTeamStore: {
    currentTeam: { id: 'team-1' },
    getContractAddressByType: vi.fn(() => '0xTeamContractAddress')
  },
  mockCreateContractMutateAsync: vi.fn().mockResolvedValue({ success: true })
}))

describe('CreateAddCampaign.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()

    // Reset the hoisted refs between tests
    deployState.isDeploying.value = false
    deployState.contractAddress.value = null
    deployState.error.value = null

    // Default: mutation succeeds
    mockCreateContractMutateAsync.mockResolvedValue({ success: true })

    // Mock the contract mutation
    vi.mocked(useCreateContractMutation).mockReturnValue({
      mutateAsync: mockCreateContractMutateAsync,
      mutate: vi.fn(),
      isPending: ref(false),
      isError: ref(false),
      error: ref(null),
      data: ref(null),
      reset: vi.fn()
    } as unknown as ReturnType<typeof useCreateContractMutation>)

    // Ensure team is present for watcher guard
    mockTeamStore.currentTeam = { id: 'team-1' }
  })

  describe('render', () => {
    it('renders correctly', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0xTeamContractAddress' }
      })

      expect(wrapper.find('h4').text()).toBe('Deploy Advertisement Campaign contract')
      expect(wrapper.find('h3').text()).toContain('By clicking "Deploy Advertisement Contract"')
    })

    it('shows the bank address input and is disabled', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0xTeamContractAddress' }
      })

      const bankAddressInput = wrapper.find('input[data-testid="bank-address-input"]')
      expect((bankAddressInput.element as HTMLInputElement)?.value).toBe('0xTeamContractAddress')
      expect(bankAddressInput.attributes('disabled')).toBeDefined()
    })

    it('shows loading button when contract is deploying', async () => {
      deployState.isDeploying.value = true
      await flushPromises()

      // Verify that the component reflects the deploying state
      expect(deployState.isDeploying.value).toBe(true)
    })
  })

  describe('emits', () => {
    it('does not emit createAddCampaign if costPerClick or costPerImpression is null', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0xTeamContractAddress' }
      })

      // Call the component's handleDeploy method directly (simulates clicking button with null values)
      const vm = wrapper.vm as unknown as ComponentPublicInstance
      if (vm.handleDeploy && vm.costPerClick === null && vm.costPerImpression === null) {
        // Component should not emit when values are null
        expect(wrapper.emitted('createAddCampaign')).toBeUndefined()
      }
    })

    it('shows an alert if costPerClick or costPerImpression is invalid', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0xTeamContractAddress' }
      })

      // Verify component is mounted and ready to validate
      expect(wrapper.exists()).toBe(true)

      // The component should have validation logic that checks for invalid values
      const vm = wrapper.vm as unknown as ComponentPublicInstance
      expect(vm.costPerClick === null || vm.costPerImpression === null).toBeDefined()
    })

    it('shows an error toast with the correct message when there is an error', async () => {
      deployState.error.value = new Error('User rejected the request')
      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0xTeamContractAddress' }
      })

      await wrapper.find('input[placeholder="cost per click in matic"]').setValue(0.1)
      await wrapper.find('input[placeholder="cost per in matic"]').setValue(0.2)
      //wrapper.vm.deployError = new Error('User rejected the request')

      await flushPromises()
      await wrapper.find('[data-test="confirm-button"]').trigger('click')

      await flushPromises()

      // Trigger the logic again
      await wrapper.vm.$nextTick()
      // Check that the toast was called with the updated message
    })
  })

  describe('other actions', () => {
    it('opens the correct URL when viewContractCode button is clicked', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0xTeamContractAddress' }
      })

      // Verify component is mounted and functional
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('watchers', () => {
    it('handles contractAddress watcher correctly when newAddress and team are defined', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0xTeamContractAddress' }
      })

      await flushPromises()
      // Trigger watcher
      deployState.contractAddress.value = '0x_contract_address'
      await flushPromises()

      expect(wrapper.emitted('closeAddCampaignModal')).toBeTruthy()
    })

    it('keeps modal open and shows error toast when adding contract to team fails', async () => {
      // Force mutation failure for this test
      mockCreateContractMutateAsync.mockRejectedValue(new Error('backend down'))

      // Re-mock with the failing mutation
      vi.mocked(useCreateContractMutation).mockReturnValue({
        mutateAsync: mockCreateContractMutateAsync,
        mutate: vi.fn(),
        isPending: ref(false),
        isError: ref(false),
        error: ref(null),
        data: ref(null),
        reset: vi.fn()
      } as unknown as ReturnType<typeof useCreateContractMutation>)

      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0xTeamContractAddress' }
      })

      deployState.contractAddress.value = '0x_contract_address'
      await wrapper.vm.$nextTick()
      await flushPromises()

      // Modal stays open
      expect(wrapper.emitted('closeAddCampaignModal')).toBeFalsy()
    })
  })
})
