import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { nextTick } from 'vue'
import PendingWeeklyClaim from '../PendingWeeklyClaim.vue'
import type { WeeklyClaim } from '@/types'

dayjs.extend(utc)
dayjs.extend(isoWeek)

// Hoisted mocks and mutable holders
const {
  loadedDataRef,
  isLoadingRef,
  ownerRef,
  mockUseReadContract,
  mockTeamStore,
  mockUserStore,
  mockCurrencyStore,
  mockToastStore
} = vi.hoisted(() => {
  const loadedDataRef = { value: undefined as WeeklyClaim[] | undefined }
  const isLoadingRef = { value: false }
  const ownerRef = { value: undefined as string | undefined }

  const mockUseReadContract = vi.fn(() => ({ data: ownerRef }))

  const mockTeamStore = {
    currentTeam: { id: 1 },
    getContractAddressByType: vi.fn(() => '0x0000000000000000000000000000000000000000')
  }

  const mockUserStore = { address: '0x1111111111111111111111111111111111111111' }

  const mockCurrencyStore = {
    getTokenInfo: vi.fn(() => ({ prices: [{ id: 'local', price: 1 }] })),
    localCurrency: { code: 'USD' }
  }

  const mockToastStore = {
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }

  return {
    loadedDataRef,
    isLoadingRef,
    ownerRef,
    mockUseReadContract,
    mockTeamStore,
    mockUserStore,
    mockCurrencyStore,
    mockToastStore
  }
})

// Partially mock wagmi vue to preserve real exports (createConfig, etc.)
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as Record<string, unknown>),
    useReadContract: (...args: unknown[]) => mockUseReadContract(...(args as []))
  }
})

// Mock stores
vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore),
  useUserDataStore: vi.fn(() => mockUserStore),
  useCurrencyStore: vi.fn(() => mockCurrencyStore),
  useToastStore: vi.fn(() => mockToastStore)
}))

// Fix system time for deterministic weeks
const FIXED_DATE_ISO = '2025-12-07T12:00:00.000Z'

describe('PendingWeeklyClaim', () => {
  beforeAll(() => {
    vi.setSystemTime(new Date(FIXED_DATE_ISO))
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it('shows loading message when fetching', async () => {
    loadedDataRef.value = []
    isLoadingRef.value = true
    ownerRef.value = '0x3333333333333333333333333333333333333333'

    const wrapper = mount(PendingWeeklyClaim, {
      global: {
        stubs: {
          TableComponent: { template: '<div />' },
          UserComponent: { template: '<div />' },
          RatePerHourList: { template: '<div />' },
          RatePerHourTotalList: { template: '<div />' },
          CRSigne: { template: '<div />' },
          CRWeeklyClaimOwnerHeader: { template: '<div />' }
        }
      }
    })

    await nextTick()
    expect(wrapper.text()).toContain('isFetching pending weekly claims...')
  })
})
