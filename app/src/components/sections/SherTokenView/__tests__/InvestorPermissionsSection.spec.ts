import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import { reactive, ref } from 'vue'
import InvestorPermissionsSection from '../InvestorPermissionsSection.vue'
import {
  mockInvestorPermissions,
  mockInvestorWrites,
  mockTeamStore,
  mockToast,
  mockUserStore
} from '@/tests/mocks'
import { MINTER_ROLE } from '@/queries/investorPermissions.queries'
import { useGetTeamOfficersQuery, type TeamOfficerWithContracts } from '@/queries/contract.queries'

const owner = '0x1000000000000000000000000000000000000000' as Address
const member = '0x2000000000000000000000000000000000000000' as Address
const router = '0x3000000000000000000000000000000000000000' as Address
const external = '0x4000000000000000000000000000000000000000' as Address
const currentOfficer = '0x5000000000000000000000000000000000000000' as Address
const previousOfficer = '0x6000000000000000000000000000000000000000' as Address

const officerHistory: TeamOfficerWithContracts[] = [
  {
    id: 2,
    address: currentOfficer,
    version: '2.0.1',
    teamId: 1,
    deployer: owner,
    deployBlockNumber: '20',
    deployedAt: '2026-09-28T00:00:00.000Z',
    previousOfficerId: 1,
    isCurrent: true,
    contracts: [],
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z'
  },
  {
    id: 1,
    address: previousOfficer,
    version: '2.0.0',
    teamId: 1,
    deployer: owner,
    deployBlockNumber: '10',
    deployedAt: '2026-09-27T00:00:00.000Z',
    previousOfficerId: null,
    isCurrent: false,
    contracts: [],
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt: '2026-09-27T00:00:00.000Z'
  }
]

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
    const team = reactive({
      ...mockTeamStore.currentTeam,
      isArchived: false,
      ownerAddress: owner,
      currentOfficer: {
        id: 2,
        address: currentOfficer,
        teamId: 1,
        deployer: owner,
        deployBlockNumber: '20',
        deployedAt: '2026-09-28T00:00:00.000Z',
        previousOfficerId: 1,
        version: '2.0.1',
        previousOfficer: { id: 1, address: previousOfficer },
        createdAt: '2026-09-28T00:00:00.000Z',
        updatedAt: '2026-09-28T00:00:00.000Z'
      },
      members: [
        { id: '1', name: 'Owner', address: owner, teamId: 1 },
        { id: '2', name: 'Member', address: member, teamId: 1 }
      ],
      teamContracts: [
        {
          type: 'SafeDepositRouter',
          address: router,
          deployer: owner,
          admins: []
        }
      ]
    })
    mockTeamStore.currentTeam = team
    mockTeamStore.currentTeamMeta.data = team
    vi.mocked(useGetTeamOfficersQuery).mockReturnValue({
      data: ref(officerHistory),
      isPending: ref(false),
      isError: ref(false),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useGetTeamOfficersQuery>)
    mockInvestorPermissions.hasRole.data.value = true
    mockInvestorPermissions.hasRole.isLoading.value = false
    mockInvestorPermissions.list.data.value = {
      evidence: 'complete',
      gaps: [],
      accounts: [
        { address: owner, isOwner: true, isAdmin: true, isMinter: true },
        { address: router, isOwner: false, isAdmin: false, isMinter: true },
        { address: currentOfficer, isOwner: false, isAdmin: true, isMinter: true },
        { address: previousOfficer, isOwner: false, isAdmin: false, isMinter: true }
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
    expect(wrapper.text()).toContain('Officer')
    expect(wrapper.text()).toContain('Officer (previous)')
    expect(wrapper.text()).not.toContain('External account')
  })

  it('keeps an unrelated role holder classified as external', () => {
    mockInvestorPermissions.list.data.value.accounts.push({
      address: external,
      isOwner: false,
      isAdmin: false,
      isMinter: true
    })

    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('External account')
    expect(wrapper.text()).toContain('External')
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

  it('[AC-US-SHER-009-02] distinguishes loading and unavailable evidence and retries it', async () => {
    mockInvestorPermissions.list.isPending.value = true
    const loading = createWrapper()
    expect(loading.find('[data-test="permission-loading"]').exists()).toBe(true)

    mockInvestorPermissions.list.isPending.value = false
    mockInvestorPermissions.list.data.value = {
      accounts: [],
      evidence: 'unavailable',
      gaps: ['Investor ownership could not be read.']
    }
    const unavailable = createWrapper()

    expect(unavailable.text()).toContain('Permission history is unavailable')
    await unavailable.get('[data-test="permission-evidence-retry"]').trigger('click')
    expect(mockInvestorPermissions.list.refetch).toHaveBeenCalledOnce()
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

  it('[AC-US-SHER-009-03] rejects a grant target outside the team directory', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-test="grant-minter-open"]').trigger('click')
    wrapper.findComponent(SelectMemberContractsInputStub).vm.$emit('update:modelValue', {
      name: 'External',
      address: external
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="grant-minter-confirm"]').attributes('disabled')).toBeDefined()
  })

  it('[AC-US-SHER-009-07] requires impact confirmation before revoking a technical minter', async () => {
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

  it('[AC-US-SHER-009-05] disables role changes for a non-administrator', async () => {
    mockInvestorPermissions.hasRole.data.value = false
    const wrapper = createWrapper()

    expect(wrapper.get('[data-test="grant-minter-open"]').attributes('disabled')).toBeDefined()
    expect(
      wrapper.get(`[data-test="revoke-minter-${router.toLowerCase()}"]`).attributes('disabled')
    ).toBeDefined()
  })

  it('[AC-US-SHER-009-05] blocks a pending grant when the team becomes archived', async () => {
    const wrapper = createWrapper()
    await wrapper.get('[data-test="grant-minter-open"]').trigger('click')
    await wrapper.get('[data-test="select-grant-target"]').trigger('click')

    mockTeamStore.currentTeamMeta.data.isArchived = true
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="grant-minter-confirm"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="grant-minter-confirm"]').trigger('click')
    expect(mockInvestorWrites.grantRole.mutateAsync).not.toHaveBeenCalled()
  })

  it('[AC-US-SHER-009-08] keeps a failed grant visible without reporting success', async () => {
    mockInvestorWrites.grantRole.mutateAsync.mockRejectedValueOnce(new Error('grant failed'))
    const wrapper = createWrapper()

    await wrapper.get('[data-test="grant-minter-open"]').trigger('click')
    await wrapper.get('[data-test="select-grant-target"]').trigger('click')
    await wrapper.get('[data-test="grant-minter-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="grant-minter-error"]').exists()).toBe(true)
    expect(mockToast.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Minter role granted' })
    )
  })
})
