import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ShareholderList from '../../SherTokenView/ShareholderList.vue'
import { parseEther, parseUnits } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import { mockInvestorReads, mockTeamStore, mockUserStore, resetContractMocks } from '@/tests/mocks'

const TableComponentStub = {
  props: ['rows', 'columns', 'loading'],
  template: `
    <div>
      <slot name="address-data" :row="rows[0]" />
      <slot name="actions-data" :row="rows[0]" />
    </div>
  `
}

const MintFormStub = {
  name: 'MintForm',
  props: ['memberInput', 'disabled', 'modelValue'],
  emits: ['close-modal', 'update:modelValue'],
  template: '<div data-test="mint-form" :data-address="memberInput?.address" />'
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
          MintForm: MintFormStub,
          UserComponent: true
        }
      }
    })

  it('opens mint modal when clicking mint individual', async () => {
    const wrapper = createComponent()

    // No MintForm before the click — modal body is not mounted
    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(false)

    await wrapper.find('[data-test="mint-individual"]').trigger('click')
    await wrapper.vm.$nextTick()

    const mintForm = wrapper.find('[data-test="mint-form"]')
    expect(mintForm.exists()).toBe(true)
    // Selected shareholder propagated to MintForm via memberInput.address
    expect(mintForm.attributes('data-address')).toBe('0x123')
  })
})
