import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ShareholderList from '../../SherTokenView/ShareholderList.vue'
import { parseEther, parseUnits, type Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import ModalComponent from '@/components/ModalComponent.vue'
import { mockToastStore } from '@/tests/mocks/store.mock'
// import TableComponent from '@/components/TableComponent.vue'
// import { useTeamStore } from '@/stores'
// import { mockTeamStore } from '@/tests/mocks/store.mock'

const mockWriteContract = vi.fn()

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

describe.skip('ShareholderList', () => {
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
              type: 'InvestorV1',
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
        totalSupply: parseUnits('300', 6),
        totalSupplyLoading: false,
        shareholders: [
          { shareholder: '0x123', amount: parseEther('100') },
          { shareholder: '0x456', amount: parseEther('200') }
        ],
        loading: false
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          TableComponent: false
        }
      }
    })
  }

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
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).mintError = 'Mint failed'
    await wrapper.vm.$nextTick()

    expect(mockToastStore.addErrorToast).toHaveBeenCalled()
  })

  it('should emit refetchShareholders, add success toast and set modal to false when mint success', async () => {
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).isSuccessMinting = true
    ;(wrapper.vm as unknown as ComponentData).isConfirmingMint = true
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as ComponentData).isConfirmingMint = false
    await wrapper.vm.$nextTick()

    expect(mockToastStore.addSuccessToast).toHaveBeenCalled()
    expect(wrapper.emitted('refetchShareholders')).toBeTruthy()
    expect((wrapper.vm as unknown as ComponentData).mintIndividualModal).toBeFalsy()
  })
})
