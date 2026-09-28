import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { type Address, zeroHash } from 'viem'
import ShareholderClaimSection from '../ShareholderClaimSection.vue'
import { useGetInvestorMigrationQuery } from '@/queries/investorMigration.queries'
import type { InvestorMigration } from '@/queries/investorMigration.queries'
import { mockInvestorReads, mockTeamStore, mockUserStore, renderWithProviders } from '@/tests/mocks'

const COMPANY_OWNER = '0x1111111111111111111111111111111111111111' as Address
const OTHER_OWNER = '0x2222222222222222222222222222222222222222' as Address
const INVESTOR_ADDRESS = '0x4234567890123456789012345678901234567890' as Address
const MIGRATION_ROOT = `0x${'1'.repeat(64)}` as const

const migrationData: InvestorMigration = {
  id: 1,
  teamId: 1,
  previousInvestorAddress: OTHER_OWNER,
  newInvestorAddress: INVESTOR_ADDRESS,
  merkleRoot: MIGRATION_ROOT,
  blockNumber: '42',
  shareholders: [{ shareholder: COMPANY_OWNER, amount: '1000000' }],
  proofs: { [COMPANY_OWNER.toLowerCase()]: [`0x${'2'.repeat(64)}`] },
  createdAt: '2026-09-28T00:00:00.000Z'
}

const createWrapper = () =>
  renderWithProviders(ShareholderClaimSection, {
    global: {
      stubs: {
        MerkleClaimForm: {
          name: 'MerkleClaimForm',
          props: ['investorAddress', 'migrationData', 'userAddress'],
          template: '<div data-test="claim-form-stub" />'
        },
        MigrationOwnerSweep: {
          name: 'MigrationOwnerSweep',
          props: ['investorAddress', 'migrationData'],
          template: '<div data-test="owner-sweep-stub" />'
        },
        UAlert: {
          name: 'UAlert',
          props: ['title', 'description'],
          template:
            '<div><span data-test="alert-title">{{ title }}</span><span>{{ description }}</span></div>'
        }
      }
    }
  })

describe('ShareholderClaimSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.address = COMPANY_OWNER
    mockTeamStore.currentTeamId = '1'
    mockTeamStore.currentTeamMeta.data = {
      ...mockTeamStore.currentTeamMeta.data,
      ownerAddress: COMPANY_OWNER
    }
    mockInvestorReads.migrationRoot.data.value = MIGRATION_ROOT
    mockInvestorReads.migrationComplete.data.value = false
    mockInvestorReads.owner.data.value = COMPANY_OWNER
    mockInvestorReads.owner.error.value = null
    mockInvestorReads.owner.isPending.value = false
    vi.mocked(useGetInvestorMigrationQuery).mockReturnValue({
      data: ref([migrationData])
    } as never)
  })

  it('[AC-US-SHER-007-06] exposes settlement only to the company and Investor owner', async () => {
    const wrapper = createWrapper()

    expect(wrapper.findComponent({ name: 'MigrationOwnerSweep' }).exists()).toBe(true)

    mockInvestorReads.owner.data.value = OTHER_OWNER
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'MigrationOwnerSweep' }).exists()).toBe(false)
    expect(wrapper.find('[data-test="migration-owner-verification"]').text()).toContain(
      'Investor owner access required'
    )
    expect(wrapper.findComponent({ name: 'MerkleClaimForm' }).exists()).toBe(true)
  })

  it('keeps settlement unavailable while Investor ownership is loading', () => {
    mockInvestorReads.owner.data.value = undefined
    mockInvestorReads.owner.isPending.value = true

    const wrapper = createWrapper()

    expect(wrapper.findComponent({ name: 'MigrationOwnerSweep' }).exists()).toBe(false)
    expect(wrapper.find('[data-test="migration-owner-verification"]').text()).toContain(
      'Checking Investor ownership'
    )
    expect(wrapper.findComponent({ name: 'MerkleClaimForm' }).exists()).toBe(true)
  })

  it('keeps settlement unavailable when Investor ownership cannot be read', () => {
    mockInvestorReads.owner.data.value = undefined
    mockInvestorReads.owner.error.value = new Error('owner read failed')

    const wrapper = createWrapper()

    expect(wrapper.findComponent({ name: 'MigrationOwnerSweep' }).exists()).toBe(false)
    expect(wrapper.find('[data-test="migration-owner-verification"]').text()).toContain(
      'Investor ownership unavailable'
    )
    expect(wrapper.findComponent({ name: 'MerkleClaimForm' }).exists()).toBe(true)
  })

  it('[AC-US-SHER-006-03] hides migration actions without a root or persisted snapshot', async () => {
    mockInvestorReads.migrationRoot.data.value = zeroHash
    const wrapper = createWrapper()

    expect(wrapper.findComponent({ name: 'MerkleClaimForm' }).exists()).toBe(false)

    mockInvestorReads.migrationRoot.data.value = MIGRATION_ROOT
    vi.mocked(useGetInvestorMigrationQuery).mockReturnValue({ data: ref([]) } as never)
    wrapper.unmount()
    const wrapperWithoutSnapshot = createWrapper()

    expect(wrapperWithoutSnapshot.findComponent({ name: 'MerkleClaimForm' }).exists()).toBe(false)
  })
})
