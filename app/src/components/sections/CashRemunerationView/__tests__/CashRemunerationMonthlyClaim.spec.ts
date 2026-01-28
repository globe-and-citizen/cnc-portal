import { VueWrapper, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import CashRemunerationMonthlyClaim from '../CashRemunerationMonthlyClaim.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

const mockError = ref<unknown>(null)
// const mockToastError = vi.fn()


// vi.mock('@/stores', async (importOriginal) => {
//   const actual: object = await importOriginal()
//   return {
//     ...actual,
//     useTeamStore: vi.fn(() => ({
//       currentTeamId: 123,
//       currentTeam: { id: 123, name: 'Test Team' }
//     })),
//     useToastStore: vi.fn(() => ({
//       addErrorToast: mockToastError
//     })),
//   }
// })

vi.mock('@/utils', async (importOriginal) => {
  const original = await importOriginal()
  const newObject = { ...(original || {}) }
  return {
    ...newObject,
    formatCurrencyShort: vi.fn((amount: number, code: string) => `${amount}${code}`),
    log: { error: vi.fn() }
  }
})

describe.skip('CashRemunerationMonthlyClaim.vue', () => {
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
  })

  it('renders the component properly', () => {
    wrapper = createComponent()
    expect(wrapper.exists()).toBe(true)
  })

  // it('calls toast and log when error is set', async () => {
  //   const { log } = await import('@/utils')
  //   wrapper = createComponent()

  //   mockError.value = new Error('Fetch error')
  //   await wrapper.vm.$nextTick()

  //   expect(mockToastError).toHaveBeenCalledWith('Failed to fetch monthly withdrawn amount')
  //   expect(log.error).toHaveBeenCalled()
  // })

  it('renders percentage increase text', () => {
    wrapper = createComponent()
    const percentageText = wrapper.find('[data-test="percentage-increase"]')
    expect(percentageText.exists()).toBe(true)
    expect(percentageText.text()).toContain('+ 26.3%')
  })
})
