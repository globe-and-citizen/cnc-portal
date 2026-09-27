import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import InvestorPermissionsSection from '../InvestorPermissionsSection.vue'
import {
  mockInvestorPermissions,
  mockInvestorWrites,
  mockTeamStore,
  mockUserStore
} from '@/tests/mocks'
import { MINTER_ROLE } from '@/queries/investorPermissions.queries'

const owner = '0x1000000000000000000000000000000000000000' as Address
const member = '0x2000000000000000000000000000000000000000' as Address
const router = '0x3000000000000000000000000000000000000000' as Address

const TableStub = {
  props: ['data', 'columns'],
  template: `
    <div>
      <div v-for="item in data" :key="item.address">
        <slot name="identity-cell" :row="{ original: item }" />
        <slot name="roles-cell" :row="{ original: item }" />
        <slot name="type-cell" :row="{ original: item }" />
        <slot name="actions-cell" :row="{ original: item }" />
      </div>
    </div>
  `
}

const SelectMemberContractsInputStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `
    <button
      data-test="select-grant-target"
      @click="$emit('update:modelValue', { name: 'Member', address: '${member}' })"
    >Select</button>
  `
}

const CheckboxStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<button data-test="revoke-impact-confirmation" @click="$emit(\'update:modelValue\', !modelValue)">Confirm impact</button>'
}

describe('InvestorPermissionsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.address = owner
    mockTeamStore.currentTeam = {
      ...mockTeamStore.currentTeam,
      ownerAddress: owner,
      members: [{ id: '1', name: 'Member', address: member, teamId: 1 }],
      teamContracts: [
        {
          type: 'SafeDepositRouter',
          address: router,
          deployer: owner,
          admins: []
        }
      ]
    }
    mockInvestorPermissions.hasRole.data.value = true
    mockInvestorPermissions.list.data.value = {
      evidence: 'complete',
      gaps: [],
      accounts: [
        { address: owner, isOwner: true, isAdmin: true, isMinter: true },
        { address: router, isOwner: false, isAdmin: false, isMinter: true }
      ]
    }
    mockInvestorWrites.grantRole.mutateAsync.mockResolvedValue({ hash: '0xgrant' })
    mockInvestorWrites.revokeRole.mutateAsync.mockResolvedValue({ hash: '0xrevoke' })
  })

  const createWrapper = () =>
    mount(InvestorPermissionsSection, {
      global: {
        stubs: {
          UTable: TableStub,
          AddressTooltip: true,
          SelectMemberContractsInput: SelectMemberContractsInputStub,
          UCheckbox: CheckboxStub
        }
      }
    })

  it('[AC-US-SHER-009-01] shows verified owners, administrators, and minters', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Owner')
    expect(wrapper.text()).toContain('Administrator')
    expect(wrapper.text()).toContain('Minter')
    expect(wrapper.text()).toContain('SafeDepositRouter')
  })

  it('[AC-US-SHER-009-02] warns when discovery evidence is incomplete', () => {
    mockInvestorPermissions.list.data.value = {
      ...mockInvestorPermissions.list.data.value,
      evidence: 'partial'
    }

    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="permission-evidence-warning"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Permission evidence is incomplete')
  })

  it('[AC-US-SHER-009-03] grants the minter role to a selected team account', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-test="grant-minter-open"]').trigger('click')
    await wrapper.get('[data-test="select-grant-target"]').trigger('click')
    await wrapper.get('[data-test="grant-minter-confirm"]').trigger('click')
    await flushPromises()

    expect(mockInvestorWrites.grantRole.mutateAsync).toHaveBeenCalledWith({
      args: [MINTER_ROLE, member]
    })
  })

  it('[AC-US-SHER-009-04] requires impact confirmation before revoking a technical minter', async () => {
    const wrapper = createWrapper()

    await wrapper.get(`[data-test="revoke-minter-${router.toLowerCase()}"]`).trigger('click')
    expect(wrapper.get('[data-test="revoke-minter-confirm"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="revoke-impact-confirmation"]').trigger('click')
    await wrapper.get('[data-test="revoke-minter-confirm"]').trigger('click')
    await flushPromises()

    expect(mockInvestorWrites.revokeRole.mutateAsync).toHaveBeenCalledWith({
      args: [MINTER_ROLE, router]
    })
  })

  it('prevents an administrator from revoking the owner minter role', () => {
    const wrapper = createWrapper()

    expect(
      wrapper.get(`[data-test="revoke-minter-${owner.toLowerCase()}"]`).attributes('disabled')
    ).toBeDefined()
  })
})
