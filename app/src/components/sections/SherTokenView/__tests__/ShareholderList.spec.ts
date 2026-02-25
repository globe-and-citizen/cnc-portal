import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ShareholderList from '../../SherTokenView/ShareholderList.vue'
import { parseEther, parseUnits, type Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import { mockInvestorReads, mockTeamStore, mockUserStore, resetContractMocks } from '@/tests/mocks'

interface ComponentData {
  mintIndividualModal: { mount: boolean; show: boolean }
  selectedShareholder: Address | null
}

const TableComponentStub = {
  props: ['rows', 'columns', 'loading'],
  template: `
    <div>
      <slot name="address-data" :row="rows[0]" />
      <slot name="actions-data" :row="rows[0]" />
    </div>
  `
}

const ModalComponentStub = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'reset'],
  template: '<div data-test="modal" />'
}

const MintFormStub = {
  template: '<div data-test="mint-form" />'
}

describe('ShareholderList', () => {
  beforeEach(() => {
    resetContractMocks()
    vi.clearAllMocks()

    mockTeamStore.currentTeam = {
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
    }
    mockUserStore.address = '0xOwnerAddress'

    mockInvestorReads.symbol.data.value = 'TEST'
    mockInvestorReads.totalSupply.data.value = parseUnits('300', 6)
    mockInvestorReads.shareholders.data.value = [
      { shareholder: '0x123', amount: parseEther('100') },
      { shareholder: '0x456', amount: parseEther('200') }
    ]
  })

  const createComponent = () =>
    mount(ShareholderList, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          TableComponent: TableComponentStub,
          ModalComponent: ModalComponentStub,
          MintForm: MintFormStub,
          CardComponent: { template: '<div><slot /></div>' },
          UserComponent: { template: '<div />' },
          ButtonUI: { template: '<button data-test="mint-individual"><slot /></button>' }
        }
      }
    })

  it('opens mint modal when clicking mint individual', async () => {
    const wrapper = createComponent()

    await wrapper.find('[data-test="mint-individual"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).mintIndividualModal.show).toBe(true)
    expect((wrapper.vm as unknown as ComponentData).selectedShareholder).toBe('0x123')
    expect(wrapper.find('[data-test="modal"]').exists()).toBe(true)
  })

  it('closes modal when ModalComponent emits update', async () => {
    const wrapper = createComponent()

    await wrapper.find('[data-test="mint-individual"]').trigger('click')
    await wrapper.vm.$nextTick()

    const modalComponent = wrapper.findComponent(ModalComponentStub)
    modalComponent.vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).mintIndividualModal.show).toBe(false)
  })
})
