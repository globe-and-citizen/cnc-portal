import { VueWrapper, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CashRemunerationMonthlyClaim from '../CashRemunerationMonthlyClaim.vue'
import { createTestingPinia } from '@pinia/testing'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'
import { useTeamWeeklyClaimsQuery } from '@/queries/weeklyClaim.queries'

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
  it('renders the component properly', () => {
    wrapper = createComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('computes totalMonthlyClaim correctly', async () => {
    wrapper = createComponent()
    const result = (wrapper.vm as unknown as { totalMonthlyClaim: string }).totalMonthlyClaim
    expect(result).toBe('$2.8K')
  })

  it('returns empty string when weeklyClaims is null', () => {
    vi.mocked(useTeamWeeklyClaimsQuery).mockReturnValueOnce(createMockQueryResponse(undefined))

    wrapper = createComponent()
    const result = (wrapper.vm as unknown as { totalMonthlyClaim: string }).totalMonthlyClaim

    expect(result).toBe('')
  })
})
