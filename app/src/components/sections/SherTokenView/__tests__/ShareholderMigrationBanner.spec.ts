import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import ShareholderMigrationBanner from '@/components/sections/SherTokenView/ShareholderMigrationBanner.vue'
import { useInvestorAddress, useInvestorTotalSupply } from '@/composables/investor/reads'
import { InconsistentSupplyError } from '@/composables/investor/useShareholderMigration'
import { useTeamStore } from '@/stores'
import { mockInvestorReads, mockTeamStore } from '@/tests/mocks'

// ---------------------------------------------------------------------------
// Mock the migration composable. Investor reads + team store come from the
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
    totalSupply?: bigint | null | undefined
    investorAddress?: Address | null
  } = {}
) {
  const previousOfficer =
    'previousOfficer' in opts ? opts.previousOfficer : { address: PREVIOUS_OFFICER }
  const totalSupply = 'totalSupply' in opts ? opts.totalSupply : 0n
  const investorAddress = 'investorAddress' in opts ? opts.investorAddress : NEW_INVESTOR

  vi.mocked(useTeamStore).mockReturnValue({
    ...mockTeamStore,
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

  vi.mocked(useInvestorAddress).mockReturnValue(
    computed(() => investorAddress) as unknown as ReturnType<typeof useInvestorAddress>
  )

  mockInvestorReads.totalSupply.data.value =
    totalSupply === undefined ? undefined : (totalSupply as unknown as bigint)
  vi.mocked(useInvestorTotalSupply).mockReturnValue(
    mockInvestorReads.totalSupply as unknown as ReturnType<typeof useInvestorTotalSupply>
  )
}

function mountBanner() {
  return mount(ShareholderMigrationBanner, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs
    }
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

  it('shows the banner when a previous officer exists and new supply is 0', async () => {
    setupMocks({ totalSupply: 0n })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="migrate-from-previous-button"]').exists()).toBe(true)
  })

  it('hides the banner when there is no previous officer', async () => {
    setupMocks({ previousOfficer: null, totalSupply: 0n })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(false)
  })

  it('hides the banner when the new InvestorV1 already has a non-zero totalSupply', async () => {
    setupMocks({ totalSupply: 1n })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(false)
  })

  it('hides the banner when totalSupply is undefined (still loading)', async () => {
    setupMocks({ totalSupply: undefined })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(false)
  })

  it('hides the banner when current investor address is null', async () => {
    setupMocks({ investorAddress: null, totalSupply: 0n })
    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="shareholder-migration-banner"]').exists()).toBe(false)
  })

  it('calls migrate.mutate with previous officer + new investor addresses on click', async () => {
    setupMocks({ totalSupply: 0n })
    const wrapper = mountBanner()
    await flushPromises()

    await wrapper.find('[data-test="migrate-from-previous-button"]').trigger('click')

    expect(mockMigrateState.mutate).toHaveBeenCalledTimes(1)
    const [args] = mockMigrateState.mutate.mock.calls[0]
    expect(args).toEqual({
      previousOfficerAddress: PREVIOUS_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })
  })

  it('renders the inline error alert when migrate.error is set', async () => {
    setupMocks({ totalSupply: 0n })
    mockMigrateState.isError.value = true
    mockMigrateState.error.value = new Error('mint reverted')

    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="migration-banner-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="migration-banner-blocked"]').exists()).toBe(false)
  })

  it('renders the "blocked" alert when error is an InconsistentSupplyError', async () => {
    setupMocks({ totalSupply: 0n })
    mockMigrateState.isError.value = true
    mockMigrateState.error.value = new InconsistentSupplyError('supply mismatch')

    const wrapper = mountBanner()
    await flushPromises()

    expect(wrapper.find('[data-test="migration-banner-blocked"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="migration-banner-error"]').exists()).toBe(false)

    const btn = wrapper.findComponent('[data-test="migrate-from-previous-button"]')
    expect(btn.props('disabled')).toBe(true)
  })

  it('shows the button in a loading state while migration is pending', async () => {
    setupMocks({ totalSupply: 0n })
    mockMigrateState.isPending.value = true

    const wrapper = mountBanner()
    await flushPromises()

    const btn = wrapper.findComponent('[data-test="migrate-from-previous-button"]')
    expect(btn.props('loading')).toBe(true)
    expect(btn.props('disabled')).toBe(true)
  })
})
