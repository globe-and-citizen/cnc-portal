import { createTestingPinia } from '@pinia/testing'
import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import InvestorsSection from '../InvestorsSection.vue'
import { ref } from 'vue'
import InvestorsActions from '../InvestorsActions.vue'
import ShareholderList from '../ShareholderList.vue'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}
// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract)
  }
})
vi.mock('@/stores/useToastStore')

interface ComponentData {
  tokenBalanceError: unknown
  totalSupplyError: unknown
  tokenSymbolError: unknown
  shareholderError: unknown
}

describe('InvestorsSection', () => {
  const createComponent = () => {
    return shallowMount(InvestorsSection, {
      props: {
        team: {
          id: '1',
          name: 'Test Team',
          ownerAddress: '0xOwnerAddress',
          teamContracts: [
            {
              address: '0xcontractaddress',
              admins: [],
              type: 'InvestorsV1',
              deployer: '0xdeployeraddress'
            }
          ],
          members: [
            { id: '1', address: '0x123', name: 'John Doe', teamId: 1 },
            { id: '2', address: '0x456', name: 'Jane Doe', teamId: 1 }
          ],
          description: ''
        }
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }
  it('should refetch when InvestorsActions emit refetchShareholders', async () => {
    const wrapper = createComponent()

    const investorsActions = wrapper.findComponent(InvestorsActions)
    investorsActions.vm.$emit('refetchShareholders')

    expect(mockUseReadContract.refetch).toHaveBeenCalled()
  })

  it('should refetch when ShareholderList emit refetchShareholders', async () => {
    const wrapper = createComponent()

    const shareholderList = wrapper.findComponent(ShareholderList)
    shareholderList.vm.$emit('refetchShareholders')

    expect(mockUseReadContract.refetch).toHaveBeenCalled()
  })

  it('should show error toast when tokenBalanceError is set', async () => {
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).tokenBalanceError = new Error('Token balance error')
    await wrapper.vm.$nextTick()

    const { addErrorToast } = useToastStore()
    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should show error toast when totalSupplyError is set', async () => {
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).totalSupplyError = new Error('Total supply error')
    await wrapper.vm.$nextTick()

    const { addErrorToast } = useToastStore()
    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should show error toast when tokenSymbolError is set', async () => {
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).tokenSymbolError = new Error('Total supply error')
    await wrapper.vm.$nextTick()

    const { addErrorToast } = useToastStore()
    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should show error toast when shareholderError is set', async () => {
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).shareholderError = new Error('Shareholder error')
    await wrapper.vm.$nextTick()

    const { addErrorToast } = useToastStore()
    expect(addErrorToast).toHaveBeenCalled()
  })
})
