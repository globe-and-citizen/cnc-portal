import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CRWeeklyClaimMemberHeader from '../CRWeeklyClaimMemberHeader.vue'
import { createTestingPinia } from '@pinia/testing'
import { type Wage } from '@/types'
import { useTeamWagesQuery } from '@/queries/index'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'

describe('CRWeeklyClaimMemberHeader', () => {
  it('should show SubmitClaims component when user has wage', () => {
    const wrapper = mount(CRWeeklyClaimMemberHeader, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          SubmitClaims: true // Stub out the SubmitClaims component to avoid complex mocking
        }
      }
    })

    // Should show the SubmitClaims component
    expect(wrapper.findComponent({ name: 'SubmitClaims' }).exists()).toBe(true)

    // Should not show the disabled button
    expect(wrapper.find('[data-test="submit-claim-disabled-button"]').exists()).toBe(false)

    // Should not have tooltip class on the container
    expect(wrapper.find('[data-tip]').exists()).toBe(false)
  })

  it('should show disabled button with tooltip when user has no wage', () => {
    vi.mocked(useTeamWagesQuery).mockReturnValueOnce(createMockQueryResponse([] as Wage[]))

    const wrapper = mount(CRWeeklyClaimMemberHeader, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          SubmitClaims: true // Stub out the SubmitClaims component to avoid complex mocking
        }
      }
    })

    // Should not show the SubmitClaims component
    expect(wrapper.findComponent({ name: 'SubmitClaims' }).exists()).toBe(false)

    // Should show the disabled button
    const disabledButton = wrapper.find('[data-test="submit-claim-disabled-button"]')
    expect(disabledButton.exists()).toBe(true)
    expect(disabledButton.text()).toBe('Submit Claim')

    // Should have tooltip with appropriate message
    const tooltipContainer = wrapper.find('.tooltip')
    expect(tooltipContainer.exists()).toBe(true)
    expect(tooltipContainer.attributes('data-tip')).toBe(
      'You need to have a wage set up to submit claims'
    )
  })
})
