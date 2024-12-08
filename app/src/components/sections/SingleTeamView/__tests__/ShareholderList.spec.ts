import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ShareholderList from '../ShareholderList.vue'
import { parseEther, type Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'

vi.mock('@wagmi/vue', (importOriginal) => {
  const original: Object = importOriginal()

  return {
    ...original,
    useWriteContract: vi.fn(() => ({
      writeContract: vi.fn(),
      hash: ref(null),
      isPending: ref(false),
      error: ref(null)
    })),
    useWaitForTransactionReceipt: vi.fn(() => ({
      isLoading: ref(false),
      isSuccess: ref(false)
    }))
  }
})

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0xOwnerAddress'
  }))
}))

interface ComponentData {
  mintIndividualModal: boolean
  selectedShareholder: Address | null
}

describe('ShareholderList', () => {
  const createComponent = () => {
    return shallowMount(ShareholderList, {
      props: {
        team: {
          id: '1',
          name: 'Test Team',
          ownerAddress: '0xOwnerAddress',
          investorsAddress: '0xInvestorAddress',
          members: [
            { id: '1', address: '0x123', name: 'John Doe', teamId: 1 },
            { id: '2', address: '0x456', name: 'Jane Doe', teamId: 1 }
          ]
        },
        tokenSymbol: 'TEST',
        tokenSymbolLoading: false,
        totalSupply: parseEther('300'),
        totalSupplyLoading: false,
        shareholders: [
          { shareholder: '0x123', amount: parseEther('100') },
          { shareholder: '0x456', amount: parseEther('200') }
        ],
        loading: false
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should render the shareholder name if exists in member list', () => {
    const wrapper = createComponent()

    expect(wrapper.find('td[data-test="shareholder-name"]').text()).toBe('John Doe')
  })

  it('should open mint individual modal if mint individual button is clicked', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="mint-individual"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).mintIndividualModal).toBeTruthy()
    expect((wrapper.vm as unknown as ComponentData).selectedShareholder).toEqual('0x123')
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()
  })
})
