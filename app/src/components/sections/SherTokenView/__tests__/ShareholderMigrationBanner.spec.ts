import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { zeroHash, type Address, type Hex } from 'viem'
import ShareholderMigrationBanner from '@/components/sections/SherTokenView/ShareholderMigrationBanner.vue'
import { useInvestorV2Address, useInvestorV2MigrationRoot } from '@/composables/investor/readsV2'
import { useTeamStore } from '@/stores'
import { mockInvestorV2Reads, mockTeamStore, renderWithProviders } from '@/tests/mocks'

// ---------------------------------------------------------------------------
// Mock the migration composable. Investor v2 reads + team store come from the
// global setup files (investor.setup.ts, store.setup.ts); we just rebind them
// per test via vi.mocked().
// ---------------------------------------------------------------------------

const mockMigrateState = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref(null),
  reset: vi.fn()
}

vi.mock('@/composables/investor/useShareholderMigration', async () => {
  const actual = await vi.importActual<
    typeof import('@/composables/investor/useShareholderMigration')
  >('@/composables/investor/useShareholderMigration')
  return {
    ...actual,
    useMigrateShareholders: vi.fn(() => mockMigrateState)
  }
})

const PREVIOUS_OFFICER = '0x000000000000000000000000000000000000dead' as Address
const NEW_INVESTOR = '0x4234567890123456789012345678901234567890' as Address
const SOME_ROOT = '0x1234567800000000000000000000000000000000000000000000000000000000' as Hex

// Banner-friendly stubs for the @nuxt/ui primitives that aren't covered by
// the global stubs (UCard / UAlert / UIcon-inside-card). UButton is already
// stubbed globally.
const stubs = {
  UCard: {
    name: 'UCard',
    template: '<div data-test="u-card"><slot /></div>'
  },
  UAlert: {
    name: 'UAlert',
    props: ['color', 'title', 'description', 'variant', 'icon'],
    template:
      '<div :data-test-alert-color="color" :data-test-alert-title="title" v-bind="$attrs"><span>{{ description }}</span></div>'
  }
}

function setupMocks(
  opts: {
    previousOfficer?: { address: Address } | null
    migrationRoot?: Hex | null | undefined
    investorAddress?: Address | null
  } = {}
) {
  const previousOfficer =
    'previousOfficer' in opts ? opts.previousOfficer : { address: PREVIOUS_OFFICER }
  const migrationRoot = 'migrationRoot' in opts ? opts.migrationRoot : zeroHash
  const investorAddress = 'investorAddress' in opts ? opts.investorAddress : NEW_INVESTOR

  vi.mocked(useTeamStore).mockReturnValue({
    ...mockTeamStore,
    currentTeamId: 1,
    currentTeamMeta: {
      isPending: false,
      data: {
        ...mockTeamStore.currentTeam,
        currentOfficer: {
          id: 1,
          address: '0x0987654321098765432109876543210987654321',
          teamId: 1,
          previousOfficer
        }
      }
    }
  } as unknown as ReturnType<typeof useTeamStore>)

  vi.mocked(useInvestorV2Address).mockReturnValue(
    computed(() => investorAddress) as unknown as ReturnType<typeof useInvestorV2Address>
  )

  mockInvestorV2Reads.migrationRoot.data.value =
    migrationRoot === undefined ? undefined : (migrationRoot as unknown as Hex)
  vi.mocked(useInvestorV2MigrationRoot).mockReturnValue(
    mockInvestorV2Reads.migrationRoot as unknown as ReturnType<typeof useInvestorV2MigrationRoot>
  )
}

function mountBanner() {
  return renderWithProviders(ShareholderMigrationBanner, {
    global: { stubs }
  })
}

describe('ShareholderMigrationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMigrateState.isPending.value = false
    mockMigrateState.isError.value = false
    mockMigrateState.error.value = null
    mockMigrateState.data.value = null
  })

  it('shows the banner when a previous officer exists and no migration root is set', async () => {
    setupMocks({ migrationRoot: zeroHash })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="migrate-from-previous-button"]').exists()).toBe(true)
  })

  it('hides the banner when there is no previous officer', async () => {
    setupMocks({ previousOfficer: null, migrationRoot: zeroHash })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(false)
  })

  it('hides the banner when the new Investor already has a migration root set', async () => {
    setupMocks({ migrationRoot: SOME_ROOT })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(false)
  })

  it('hides the banner when the migration root is undefined (still loading)', async () => {
    setupMocks({ migrationRoot: undefined })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(false)
  })

  it('hides the banner when current investor address is null', async () => {
    setupMocks({ investorAddress: null, migrationRoot: zeroHash })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(false)
  })

  it('calls migrate.mutate with teamId + previous officer + new investor addresses on click', async () => {
    setupMocks({ migrationRoot: zeroHash })
    const wrapper = mountBanner()
    await flushPromises()

    await wrapper.find('[data-test="migrate-from-previous-button"]').trigger('click')

    expect(mockMigrateState.mutate).toHaveBeenCalledTimes(1)
    const [args] = mockMigrateState.mutate.mock.calls[0]
    expect(args).toEqual({
      teamId: 1,
      previousOfficerAddress: PREVIOUS_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })
  })

  it('renders the inline error alert when migrate.error is set', async () => {
    setupMocks({ migrationRoot: zeroHash })
    mockMigrateState.isError.value = true
    mockMigrateState.error.value = new Error('setMigrationRoot reverted')

    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="migration-banner-error"]').exists()).toBe(true)
  })

  it('shows the button in a loading state while migration is pending', async () => {
    setupMocks({ migrationRoot: zeroHash })
    mockMigrateState.isPending.value = true

    const wrapper = mountBanner()
    await flushPromises()

    const btn = wrapper.findComponent('[data-test="migrate-from-previous-button"]')
    expect(btn.props('loading')).toBe(true)
    expect(btn.props('disabled')).toBe(true)
  })
})
