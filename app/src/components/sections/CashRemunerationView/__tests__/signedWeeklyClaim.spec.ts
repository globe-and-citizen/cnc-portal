import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

// Shared currencyStore mock so component and tests share the same instance
const currencyStoreMock = {
  getTokenInfo: vi.fn((tokenId: string) => {
    if (tokenId === 'native') return { prices: [{ id: 'local', price: 2 }] }
    if (tokenId === 'usdc') return { prices: [{ id: 'local', price: 1 }] }
    return { prices: [{ id: 'local', price: 0 }] }
  }),
  localCurrency: { code: 'USD' }
}

// Mock team store
const mockTeamStore = {
  currentTeam: { id: 'team-1' },
  getContractAddressByType: vi.fn(() => '0xCashRemunerationAddress')
}

// Mock user data store
const mockUserDataStore = {
  address: '0xUserAddress'
}

// Mock the stores module so component and tests use the same store instance
vi.mock('@/stores', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores')>()
  return {
    ...actual,
    useCurrencyStore: () => currencyStoreMock,
    useToastStore: () => ({
      addErrorToast: mockAddErrorToast,
      addSuccessToast: vi.fn()
    }),
    useTeamStore: () => mockTeamStore,
    useUserDataStore: () => mockUserDataStore
  }
})

import SignedWeeklyClaim from '../SignedWeeklyClaim.vue'

// hoisted mocks for vitest (avoid hoisting issues)
const {
  mockUseReadContract,
  mockUseTanstackQuery,
  mockOwnerValue,
  mockInvalidateQueries,
  mockAddErrorToast
} = vi.hoisted(() => ({
  mockUseReadContract: vi.fn(),
  mockUseTanstackQuery: vi.fn(),
  mockOwnerValue: '0xOwnerAddress',
  mockInvalidateQueries: vi.fn(),
  mockAddErrorToast: vi.fn()
}))

// Mock wagmi's useReadContract
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wagmi/vue')>()
  return {
    ...actual,
    useReadContract: mockUseReadContract
  }
})

// Mock the tanstack query composable used by the component
vi.mock('@/composables', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables')>()
  return {
    ...actual,
    useTanstackQuery: mockUseTanstackQuery
  }
})

// Mock useAuthToken
vi.mock('@/composables/useAuthToken', () => ({
  useAuthToken: vi.fn(() => ref('mock-token'))
}))

// Mock useQueryClient from tanstack
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/vue-query')>()
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries
    })
  }
})

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
) as unknown as typeof fetch

// Minimal TableComponent stub that exposes the named slots used by the component
const TableComponentStub = {
  name: 'TableComponent',
  props: ['rows', 'columns', 'loading'],
  template: `
    <div>
      <slot name="member-data" :row="rows && rows[0]" />
      <slot name="weekStart-data" :row="rows && rows[0]" />
      <slot name="hoursWorked-data" :row="rows && rows[0]" />
      <slot name="hourlyRate-data" :row="rows && rows[0]" />
      <slot name="totalAmount-data" :row="rows && rows[0]" />
      <slot name="action-data" :row="rows && rows[0]" />
    </div>
  `
}

describe('SignedWeeklyClaim.vue', () => {
  let wrapper: ReturnType<typeof mount>

  const mockWeeklyClaims = [
    {
      id: '1',
      weekStart: '2023-10-02T00:00:00.000Z',
      status: 'signed',
      createdAt: '2023-10-08T00:00:00.000Z',
      member: { name: 'John Doe', address: '0xUserAddress' },
      claims: [
        { hoursWorked: 10, status: 'approved' },
        { hoursWorked: 5, status: 'approved' }
      ],
      wage: {
        maximumHoursPerWeek: 40,
        ratePerHour: [
          { type: 'native', amount: 10 },
          { type: 'usdc', amount: 20 }
        ],
        userAddress: '0xUserAddress'
      },
      data: { ownerAddress: mockOwnerValue }
    },
    {
      id: '2',
      weekStart: '2023-10-09T00:00:00.000Z',
      status: 'pending',
      data: { ownerAddress: mockOwnerValue }
    },
    {
      id: '3',
      weekStart: '2023-10-16T00:00:00.000Z',
      status: 'signed',
      data: { ownerAddress: '0xWrongOwner' }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    })

    mockUseReadContract.mockReturnValue({ data: ref(mockOwnerValue), error: ref(null) })
    mockUseTanstackQuery.mockReturnValue({ data: ref(mockWeeklyClaims), isLoading: ref(false) })
  })

  const createWrapper = () => {
    return mount(SignedWeeklyClaim, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              team: { currentTeam: { id: 'team-1' } },
              user: { address: '0xUserAddress' },
              currency: { localCurrency: { code: 'USD' } }
            }
          })
        ],
        stubs: {
          CRWeeklyClaimMemberHeader: true,
          TableComponent: TableComponentStub,
          UserComponent: true,
          RatePerHourList: true,
          RatePerHourTotalList: true,
          CRWithdrawClaim: true,
          transition: false,
          'transition-group': false
        }
      }
    })
  }

  it('renders correctly and filters claims', async () => {
    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'CRWeeklyClaimMemberHeader' }).exists()).toBe(true)
    // Only one card should be rendered (only item id=1 matches signed + owner)
    expect(wrapper.findAll('.card').length).toBe(1)
  })

  it('shows loading state', async () => {
    mockUseTanstackQuery.mockReturnValue({ data: ref([]), isLoading: ref(true) })
    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Loading pending weekly claims...')
  })

  it('shows empty state when no data', async () => {
    mockUseTanstackQuery.mockReturnValue({ data: ref([]), isLoading: ref(false) })
    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Congratulations, you have withdrawn all your Weekly Claims')
  })

  it('calculates total hours worked correctly', async () => {
    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('15:00 hrs')
  })

  it('formats week start range and month/year', async () => {
    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Oct 2-Oct 8')
    expect(wrapper.text()).toContain('October 2023')
  })

  it('calculates hourly rate in user currency', async () => {
    // currencyStoreMock already returns native=2, usdc=1 by default above
    wrapper = createWrapper()
    await flushPromises()

    // 10 * 2 + 20 * 1 = 40
    expect(wrapper.text()).toContain('≃ $40.00 USD / Hour')
  })

  it('calculates total amount correctly', async () => {
    wrapper = createWrapper()
    await flushPromises()

    // Total hours 15 * hourly 40 = 600
    expect(wrapper.text()).toContain('≃ $600.00 USD')
  })

  it('logs new weekly claims when data changes', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const dataRef = ref(mockWeeklyClaims)
    mockUseTanstackQuery.mockReturnValue({ data: dataRef, isLoading: ref(false) })

    wrapper = createWrapper()
    await flushPromises()

    // Trigger watcher by updating data
    dataRef.value = [
      ...mockWeeklyClaims,
      {
        id: '4',
        status: 'signed',
        weekStart: '2023-10-23T00:00:00.000Z',
        createdAt: '2023-10-29T00:00:00.000Z',
        member: { name: 'Jane Smith', address: '0xUserAddress' },
        claims: [{ hoursWorked: 8, status: 'approved' }],
        wage: {
          maximumHoursPerWeek: 40,
          ratePerHour: [
            { type: 'native', amount: 10 },
            { type: 'usdc', amount: 20 }
          ],
          userAddress: '0xUserAddress'
        },
        data: { ownerAddress: mockOwnerValue }
      }
    ]
    await flushPromises()

    expect(consoleLogSpy).toHaveBeenCalledWith('New weekly claims: ', expect.any(Array))
    consoleLogSpy.mockRestore()
  })

  it('handles token with no price info gracefully', async () => {
    // Override getTokenInfo to return empty prices or zero price for unknown token
    currencyStoreMock.getTokenInfo.mockImplementation((tokenId: string) => {
      if (tokenId === 'native') return { prices: [{ id: 'local', price: 2 }] }
      if (tokenId === 'usdc') return { prices: [] } // No local price
      return { prices: [{ id: 'local', price: 0 }] } // Unknown token with zero price
    })

    wrapper = createWrapper()
    await flushPromises()

    // Should still render without crashing, native=10*2=20, usdc=20*0=0
    expect(wrapper.text()).toContain('≃ $20.00 USD / Hour')

    // Reset mock
    currencyStoreMock.getTokenInfo.mockImplementation((tokenId: string) => {
      if (tokenId === 'native') return { prices: [{ id: 'local', price: 2 }] }
      if (tokenId === 'usdc') return { prices: [{ id: 'local', price: 1 }] }
      return { prices: [{ id: 'local', price: 0 }] }
    })
  })

  it('shows error toast when cashRemunerationOwner fetch fails', async () => {
    const errorRef = ref<Error | null>(null)
    mockUseReadContract.mockReturnValue({
      data: ref(null),
      error: errorRef
    })

    wrapper = createWrapper()
    await flushPromises()

    // Trigger watcher by setting error
    errorRef.value = new Error('Contract read failed')
    await flushPromises()

    expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to fetch cash remuneration owner')
  })

  describe('Weekly Claims Sync on Mount', () => {
    it('should handle sync API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const syncError = new Error('Network error during sync')

      const fetchMock = vi.fn().mockRejectedValue(syncError)
      global.fetch = fetchMock

      wrapper = createWrapper()
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to sync weekly claims:', syncError)
      // Should not crash the component
      expect(wrapper.exists()).toBe(true)

      consoleErrorSpy.mockRestore()
    })

    it('should not call sync API when team is not available', async () => {
      // Temporarily set currentTeam to null
      const originalTeam = mockTeamStore.currentTeam
      mockTeamStore.currentTeam = null as unknown as { id: string }

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })
      global.fetch = fetchMock

      wrapper = createWrapper()
      await flushPromises()

      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/weeklyclaim/sync/'),
        expect.any(Object)
      )

      // Restore
      mockTeamStore.currentTeam = originalTeam
    })
  })
})
