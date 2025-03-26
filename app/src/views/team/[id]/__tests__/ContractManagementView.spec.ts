import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ContractManagementView from '@/views/team/[id]/ContractManagementView.vue'

import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '1' }
  })
}))

vi.mock('@/stores/user', () => ({
  useUserDataStore: () => ({
    address: '0xOwnerAddress'
  })
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  })
}))

const executeMock = vi.fn()

const teamDataMock = ref({
  id: '1',
  name: 'Test Team',
  ownerAddress: '0xOwnerAddress',
  bankAddress: '0xBankAddress',
  addCampaignAddress: null,
  teamContracts: []
})

vi.mock('@/composables/useCustomFetch', () => {
  return {
    useCustomFetch: vi.fn(() => ({
      get: () => ({
        json: () => ({
          data: teamDataMock,
          execute: vi.fn(),
          error: ref(null),
          isFetching: ref(false)
        })
      }),
      put: () => ({
        json: () => ({
          execute: vi.fn()
        })
      })
    }))
  }
})

vi.mock('@/composables/addCampaign', () => {
  return {
    useDeployAddCampaignContract: () => ({
      contractAddress: ref('0xDeployedCampaignAddress'),
      execute: executeMock,
      isLoading: ref(false)
    })
  }
})

describe('ContractManagementView.vue', () => {
  const createComponent = () =>
    mount(ContractManagementView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          CardComponent: true,
          TeamMeta: true,
          CreateAddCamapaign: true,
          TeamContracts: true
        }
      }
    })

  beforeEach(() => {
    executeMock.mockClear()
  })

  it('renders the deploy button if user is team owner and no campaign exists', async () => {
    const wrapper = createComponent()
    await wrapper.vm.$nextTick()
    const button = wrapper.find('[data-test="createAddCampaign"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('Deploy advertise contract')
  })

  it('opens modal when clicking deploy button', async () => {
    const wrapper = createComponent()
    const button = wrapper.find('[data-test="createAddCampaign"]')
    await button.trigger('click')
    await wrapper.vm.$nextTick()

    const modal = wrapper.findComponent({ name: 'ModalComponent' })
    expect(modal.exists()).toBe(true)
  })

  it('calls deployAddCampaignContract when create-add-campaign is emitted', async () => {
    const wrapper = createComponent()
    console.log('=========', wrapper.html())
    const button = wrapper.find('[data-test="createAddCampaign"]')
    await button.trigger('click')
    await wrapper.vm.$nextTick()

    // Ensure the modal is rendered
    const modal = wrapper.findComponent({ name: 'ModalComponent' })
    expect(modal.exists()).toBe(true)

    // Ensure the CreateAddCamapaign component is rendered
    const createForm = modal.findComponent({ name: 'CreateAddCamapaign' })
    expect(createForm.exists()).toBe(true)

    // Simulate the emission of the create-add-campaign event from the form
    await createForm.vm.$emit('create-add-campaign', 0.01, 0.02)
    await wrapper.vm.$nextTick()

    expect(executeMock).toHaveBeenCalledWith('0xBankAddress', 0.01, 0.02, '0xOwnerAddress', '1')
  })
})
