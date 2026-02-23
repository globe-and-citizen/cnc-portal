import { describe, expect, it, vi, beforeEach } from 'vitest'
import CashRemunerationPendingClaim from '../CashRemunerationPendingClaim.vue'
import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { useGetTeamWeeklyClaimsQuery } from '@/queries'
import { mockToastStore, mockTeamStore } from '@/tests/mocks'

const mockClaims = ref([
  {
    id: 1,
    hoursWorked: 10,
    wage: {
      cashRatePerHour: 1,
      ratePerHour: []
    }
  }
])
const mockError = ref<unknown>(null)

vi.mock('@/queries', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useGetTeamWeeklyClaimsQuery: vi.fn()
  }
})

describe.skip('CashRemunerationPendingClaim', () => {
  beforeEach(() => {
    mockTeamStore.currentTeamId = '1'
    mockError.value = null

    vi.mocked(useGetTeamWeeklyClaimsQuery).mockReturnValue({
      data: mockClaims,
      isLoading: ref(false),
      error: mockError
    } as ReturnType<typeof useGetTeamWeeklyClaimsQuery>)
  })

  const createComponent = () => {
    return shallowMount(CashRemunerationPendingClaim, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('renders correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('displays error toast when there is an error', async () => {
    const wrapper = createComponent()
    mockError.value = 'Error fetching data'

    await wrapper.vm.$nextTick()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Failed to fetch monthly pending amount'
    )
  })
})
