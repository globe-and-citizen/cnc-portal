import { VueWrapper, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import CashRemunerationMonthlyClaim from '../CashRemunerationMonthlyClaim.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'

const mockError = ref<unknown>(null)
const mockToastError = vi.fn()
const mockUseTanstackQuery = vi.fn()

vi.mock('@/stores', async (importOriginal) => {
  const original = await importOriginal()
  const newObject = { ...(original || {}) }
  return {
    ...newObject,
    useTeamStore: vi.fn(() => ({
      currentTeamId: 123,
      currentTeam: { id: 123, name: 'Test Team' }
    })),
    useToastStore: vi.fn(() => ({
      addErrorToast: mockToastError
    })),
    useCurrencyStore: vi.fn(() => ({
      ...mockUseCurrencyStore,
      getTokenInfo: vi.fn(() => ({
        prices: [{ id: 'local', price: 1 }]
      }))
    }))
  }
})

vi.mock('@/composables/useTanstackQuery', () => ({
  useTanstackQuery: (...args: [string, string]) => mockUseTanstackQuery(...args)
}))

vi.mock('@/utils', async (importOriginal) => {
  const original = await importOriginal()
  const newObject = { ...(original || {}) }
  return {
    ...newObject,
    formatCurrencyShort: vi.fn((amount: number, code: string) => `${amount}${code}`),
    log: { error: vi.fn() }
  }
})

describe('CashRemunerationMonthlyClaim.vue', () => {
  let wrapper: VueWrapper<InstanceType<typeof CashRemunerationMonthlyClaim>>

  const createComponent = () => {
    return shallowMount(CashRemunerationMonthlyClaim, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          OverviewCard: { template: '<div><slot /></div>' }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockError.value = null
    mockUseTanstackQuery.mockReturnValue({
      data: ref([]),
      isLoading: ref(false),
      error: mockError
    })
  })

  it('renders the component properly', () => {
    wrapper = createComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('calls useTanstackQuery with correct arguments', () => {
    wrapper = createComponent()

    expect(mockUseTanstackQuery).toHaveBeenCalledTimes(1)
    const [queryName, endpoint, options] = mockUseTanstackQuery.mock.calls[0]

    expect(queryName).toBe('withdrawnClaims')
    expect(endpoint.value).toBe('/weeklyClaim/?teamId=123&status=withdrawn')
    expect(options.queryKey.value).toEqual(['weekly-claims', 123, 'withdrawn'])
    expect(options.refetchOnWindowFocus).toBe(true)
  })
})
