import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { computed } from 'vue'
import { zeroHash, type Address } from 'viem'
import ShareholderClaimSection from '@/components/sections/SherTokenView/ShareholderClaimSection.vue'
import {
  useInvestorV2Address,
  useInvestorV2MigrationComplete,
  useInvestorV2MigrationRoot
} from '@/composables/investor/readsV2'
import { useGetInvestorMigrationQuery } from '@/queries/investorMigration.queries'
import { useTeamStore, useUserDataStore } from '@/stores'
import {
  mockInvestorV2Reads,
  mockTeamStore,
  mockUserStore,
  renderWithProviders
} from '@/tests/mocks'
import type { InvestorMigration } from '@/queries/investorMigration.queries'

const INVESTOR = '0x4234567890123456789012345678901234567890' as Address
const OWNER_ADDRESS = '0x0000000000000000000000000000000000000001'

// UAlert is globally stubbed via the Nuxt UI component mocks (see
// tests/setup/nuxt-ui.setup.ts) — no local override needed, it already
// renders with `title`/`description` as readable props.
const stubs = {
  MerkleClaimForm: {
    name: 'MerkleClaimForm',
    props: ['investorV2Address', 'migrationData', 'userAddress'],
    template: '<div data-test="merkle-claim-form-section" />'
  },
  MigrationOwnerSweep: {
    name: 'MigrationOwnerSweep',
    props: ['investorV2Address', 'migrationData'],
    template: '<div data-test="migration-owner-sweep-section" />'
  }
}

const migrationData: InvestorMigration = {
  id: 1,
  teamId: 1,
  previousInvestorAddress: '0x1111111111111111111111111111111111111111',
  newInvestorAddress: INVESTOR,
  merkleRoot: '0x2222222222222222222222222222222222222222222222222222222222222222',
  blockNumber: '42',
  shareholders: [],
  proofs: {},
  createdAt: new Date().toISOString()
} as unknown as InvestorMigration

function setupMocks(
  opts: {
    investorAddress?: Address | null
    migrationRoot?: `0x${string}` | null | undefined
    migrationComplete?: boolean | null | undefined
    migrations?: InvestorMigration[] | undefined
    isOwner?: boolean
  } = {}
) {
  const investorAddress = 'investorAddress' in opts ? opts.investorAddress : INVESTOR
  const migrationRoot = 'migrationRoot' in opts ? opts.migrationRoot : ('0xroot' as `0x${string}`)
  const migrationComplete = 'migrationComplete' in opts ? opts.migrationComplete : false
  const migrations = 'migrations' in opts ? opts.migrations : [migrationData]
  const isOwner = opts.isOwner ?? true

  vi.mocked(useTeamStore).mockReturnValue({
    ...mockTeamStore,
    currentTeamId: 1,
    currentTeamMeta: {
      isPending: false,
      data: { ownerAddress: isOwner ? OWNER_ADDRESS : '0xSomeoneElse' }
    }
  } as unknown as ReturnType<typeof useTeamStore>)

  vi.mocked(useUserDataStore).mockReturnValue({
    ...mockUserStore,
    address: OWNER_ADDRESS
  } as unknown as ReturnType<typeof useUserDataStore>)

  vi.mocked(useInvestorV2Address).mockReturnValue(
    computed(() => investorAddress) as unknown as ReturnType<typeof useInvestorV2Address>
  )

  mockInvestorV2Reads.migrationRoot.data.value =
    migrationRoot === undefined ? undefined : migrationRoot
  vi.mocked(useInvestorV2MigrationRoot).mockReturnValue(
    mockInvestorV2Reads.migrationRoot as unknown as ReturnType<typeof useInvestorV2MigrationRoot>
  )

  mockInvestorV2Reads.migrationComplete.data.value = migrationComplete
  vi.mocked(useInvestorV2MigrationComplete).mockReturnValue(
    mockInvestorV2Reads.migrationComplete as unknown as ReturnType<
      typeof useInvestorV2MigrationComplete
    >
  )

  vi.mocked(useGetInvestorMigrationQuery).mockReturnValue({
    data: { value: migrations }
  } as unknown as ReturnType<typeof useGetInvestorMigrationQuery>)
}

function mountSection() {
  return renderWithProviders(ShareholderClaimSection, {
    global: { stubs }
  })
}

describe('ShareholderClaimSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the section when there is a committed root and a persisted snapshot', async () => {
    setupMocks()
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="merkle-claim-form-section"]').exists()).toBe(true)
  })

  it('hides the section when there is no Investor v2 address', async () => {
    setupMocks({ investorAddress: null })
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="merkle-claim-form-section"]').exists()).toBe(false)
  })

  it('hides the section while the migration root has not been committed yet', async () => {
    setupMocks({ migrationRoot: zeroHash })
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="merkle-claim-form-section"]').exists()).toBe(false)
  })

  it('hides the section when the root is undefined (still loading)', async () => {
    setupMocks({ migrationRoot: undefined })
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="merkle-claim-form-section"]').exists()).toBe(false)
  })

  it('hides the section when no migration snapshot has been persisted yet', async () => {
    setupMocks({ migrations: [] })
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="merkle-claim-form-section"]').exists()).toBe(false)
  })

  it('shows the owner sweep section only for the team owner while migration is open', async () => {
    setupMocks({ isOwner: true, migrationComplete: false })
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="migration-owner-sweep-section"]').exists()).toBe(true)
  })

  it('hides the owner sweep section for non-owners', async () => {
    setupMocks({ isOwner: false })
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="migration-owner-sweep-section"]').exists()).toBe(false)
  })

  it('hides the owner sweep section once migration is complete', async () => {
    setupMocks({ isOwner: true, migrationComplete: true })
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="migration-owner-sweep-section"]').exists()).toBe(false)
  })

  it('shows the complete status alert once migration is complete', async () => {
    setupMocks({ migrationComplete: true })
    const wrapper = mountSection()
    await flushPromises()

    const alert = wrapper.findComponent('[data-test="migration-status-alert"]')
    expect(alert.props('title')).toBe('Migration status: Complete')
  })
})
