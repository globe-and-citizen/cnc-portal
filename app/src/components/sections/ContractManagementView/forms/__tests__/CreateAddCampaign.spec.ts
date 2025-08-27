import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import CreateAddCampaign from '@/components/sections/ContractManagementView/forms/CreateAddCampaign.vue'
import ButtonUI from '@/components/ButtonUI.vue'

import { ref } from 'vue'
//import AdCampaignArtifact from '@/artifacts/abi/AdCampaignManager.json'
//import type { Abi } from 'viem'
import { mockToastStore } from '@/tests/mocks/store.mock'
//vi.mock('@/stores/useToastStore')
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
vi.mock('@wagmi/core', async (importOriginal) => {
  const actual: object = await importOriginal()

  return {
    ...actual,
    writeContract: vi.fn().mockResolvedValue('0xMOCK_TX'),
    readContract: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
    getWalletClient: vi.fn().mockResolvedValue({
      deployContract: vi.fn().mockResolvedValue('0xMOCK_DEPLOYED'),
      account: { address: '0xMOCK_ACCOUNT' }
    }),
    getPublicClient: vi.fn().mockReturnValue({
      getBlockNumber: vi.fn().mockResolvedValue(100n)
    })
  }
})

//const campaignAbi = AdCampaignArtifact.abi as Abi
vi.mock('@/composables/useContractFunctions', async (importOriginal) => {
  const actual: object = await importOriginal()

  return {
    ...actual,
    useDeployContract: mocks.mockUseDeployContract
  }
})

describe('CreateAddCampaign.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  describe('render', () => {
    it('renders correctly', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0x123456' }
      })

      expect(wrapper.find('h4').text()).toBe('Deploy Advertisement Campaign contract')
      expect(wrapper.find('h3').text()).toContain('By clicking "Deploy Advertisement Contract"')
    })

    it('shows the bank address input and is disabled', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0x123456' }
      })

      const bankAddressInput = wrapper.find('input[data-testid="bank-address-input"]')
      expect((bankAddressInput.element as HTMLInputElement)?.value).toBe('0x123456')
      expect(bankAddressInput.attributes('disabled')).toBeDefined()
    })

    it('shows loading button when contract is deploying', async () => {
      deployState.isDeploying.value = true
      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0x123456' }
      })
      await flushPromises()
      // Directly set the ref values
      await wrapper.find('input[placeholder="cost per click in matic"]').setValue(0.4)
      await wrapper.find('input[placeholder="cost per in matic"]').setValue(0.6)

      await flushPromises()
      await wrapper.find('.btn-primary').trigger('click')

      const allButtonComponentsWrapper = wrapper.findAllComponents(ButtonUI)
      expect(allButtonComponentsWrapper[1].props().loading).toBe(true)
    })
  })

  describe('emits', () => {
    it('does not emit createAddCampaign if costPerClick or costPerImpression is null', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      // Leave the values as null (default state)
      await wrapper.find('.btn-primary').trigger('click')

      expect(wrapper.emitted('createAddCampaign')).toBeUndefined()
    })

    it('shows an alert if costPerClick or costPerImpression is invalid', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      // Set costPerClick to null and costPerImpression to 0.2
      await wrapper.find('input[placeholder="cost per in matic"]').setValue(0.2)

      // Mock the alert function
      //const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

      await wrapper.find('.btn-primary').trigger('click')

      // Check that the alert was called and the event was not emitted
      //expect(alertMock).toHaveBeenCalledWith('Please enter valid numeric values for both rates.')
      //expect(wrapper.emitted('createAddCampaign')).toBeUndefined()

      //alertMock.mockRestore()
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Please enter valid numeric values for both rates.'
      )
    })

    it('shows an error toast with the correct message when there is an error', async () => {
      deployState.error.value = new Error('User rejected the request')
      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0x123456' }
      })

      await wrapper.find('input[placeholder="cost per click in matic"]').setValue(0.1)
      await wrapper.find('input[placeholder="cost per in matic"]').setValue(0.2)
      //wrapper.vm.deployError = new Error('User rejected the request')

      await flushPromises()
      await wrapper.find('.btn-primary').trigger('click')

      await flushPromises()

      // Trigger the logic again
      await wrapper.vm.$nextTick()
      // Check that the toast was called with the updated message
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('User rejected the request')
    })
  })

  describe('other actions', () => {
    it('opens the correct URL when viewContractCode button is clicked', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      const openMock = vi.spyOn(window, 'open').mockImplementation(() => null)

      // Simulate click on the "viewContractCode" button
      await wrapper.find('button.btn-secondary').trigger('click')

      // Check that window.open was called with the correct URL
      expect(openMock).toHaveBeenCalledWith(
        'https://polygonscan.com/address/0x30625FE0E430C3cCc27A60702B79dE7824BE7fD5#code',
        '_blank'
      )

      openMock.mockRestore()
    })
  })

  describe('watchers', () => {
    it('handles contractAddress watcher correctly when newAddress and team are defined', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { bankAddress: '0x123456' }
      })
      await flushPromises()
      deployState.contractAddress.value = '0x_contract_address'
      await flushPromises()
      // Simulate the watexpect(wrapper.emitted()).toHaveProperty('openAddTeamModal')cher logic

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Contract deployed successfully')
      expect(wrapper.emitted()).toHaveProperty('closeAddCampaignModal')
    })
  })
})
