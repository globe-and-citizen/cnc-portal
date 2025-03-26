import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ShareholderList from '../ShareholderList.vue'
import { parseEther, type Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

const mockWriteContract = vi.fn()
vi.mock('@wagmi/vue', (importOriginal) => {
  const original: object = importOriginal()

  return {
    ...original,
    useWriteContract: vi.fn(() => ({
      writeContract: mockWriteContract,
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

vi.mock('@/stores/useToastStore')

interface ComponentData {
  mintIndividualModal: boolean
  selectedShareholder: Address | null
  mintError: unknown
  isSuccessMinting: boolean
  isConfirmingMint: boolean
}

describe('ShareholderList', () => {
  const createComponent = () => {
    return mount(ShareholderList, {
      props: {
        team: {
          id: '1',
          name: 'Test Team',
          teamContracts: [
            {
              address: '0xcontractaddress',
              admins: [],
              type: 'InvestorsV1',
              deployer: '0xdeployeraddress'
            }
          ],
          ownerAddress: '0xOwnerAddress',
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

    await wrapper.find('[data-test="mint-individual"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).mintIndividualModal).toBeTruthy()
    expect((wrapper.vm as unknown as ComponentData).selectedShareholder).toEqual('0x123')
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()
  })

  it('should emit modal component v-model', async () => {
    const wrapper = createComponent()

    await wrapper.find('[data-test="mint-individual"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).mintIndividualModal).toBeTruthy()

    const modalComponent = wrapper.findComponent(ModalComponent)
    modalComponent.vm.$emit('update:modelValue', false)

    expect((wrapper.vm as unknown as ComponentData).mintIndividualModal).toBeFalsy()
  })

  it('should call mint when MintForm emit submit event', async () => {
    const wrapper = createComponent()

    await wrapper.find('[data-test="mint-individual"]').trigger('click')
    await wrapper.vm.$nextTick()

    const mintForm = wrapper.findComponent({ name: 'MintForm' })
    mintForm.vm.$emit('submit', '0x123', '100')

    expect(mockWriteContract).toHaveBeenCalled()
  })

  it('should add error toast when mint failed', async () => {
    const { addErrorToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).mintError = 'Mint failed'
    await wrapper.vm.$nextTick()

    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should emit refetchShareholders, add success toast and set modal to false when mint success', async () => {
    const { addSuccessToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).isSuccessMinting = true
    ;(wrapper.vm as unknown as ComponentData).isConfirmingMint = true
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as ComponentData).isConfirmingMint = false
    await wrapper.vm.$nextTick()

    expect(addSuccessToast).toHaveBeenCalled()
    expect(wrapper.emitted('refetchShareholders')).toBeTruthy()
    expect((wrapper.vm as unknown as ComponentData).mintIndividualModal).toBeFalsy()
  })
})
