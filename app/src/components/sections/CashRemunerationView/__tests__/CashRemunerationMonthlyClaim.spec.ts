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

  it('computes totalMonthlyClaim correctly', async () => {
    mockUseTanstackQuery.mockReturnValueOnce({
      data: ref([
        {
          claims: [{ hoursWorked: 10 }, { hoursWorked: 5 }],
          wage: {
            ratePerHour: [
              { type: 'TOKEN1', amount: 2 },
              { type: 'TOKEN2', amount: 1 }
            ]
          }
        }
      ]),
      isLoading: ref(false),
      error: mockError
    })

    wrapper = createComponent()
    const result = (wrapper.vm as unknown as { totalMonthlyClaim: string }).totalMonthlyClaim
    expect(result).toBe('45USD')
  })

  it('calls toast and log when error is set', async () => {
    const { log } = await import('@/utils')
    wrapper = createComponent()

    mockError.value = new Error('Fetch error')
    await wrapper.vm.$nextTick()

    expect(mockToastError).toHaveBeenCalledWith('Failed to fetch monthly withdrawn amount')
    expect(log.error).toHaveBeenCalled()
  })

  it('renders percentage increase text', () => {
    wrapper = createComponent()
    const percentageText = wrapper.find('[data-test="percentage-increase"]')
    expect(percentageText.exists()).toBe(true)
    expect(percentageText.text()).toContain('+ 26.3%')
  })

  it('returns empty string when weeklyClaims is null', () => {
    mockUseTanstackQuery.mockReturnValueOnce({
      data: ref(null),
      isLoading: ref(false),
      error: mockError
    })

    wrapper = createComponent()
    const result = (wrapper.vm as unknown as { totalMonthlyClaim: string }).totalMonthlyClaim

    expect(result).toBe('')
  })
})
