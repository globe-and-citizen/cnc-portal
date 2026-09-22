import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BodMembersEmptyState from '../BodMembersEmptyState.vue'
import ElectionSummaryEmptyState from '../ElectionSummaryEmptyState.vue'
import PastElectionsEmptyState from '../PastElectionsEmptyState.vue'

/**
 * Each empty state must read as "nothing here" — a static panel with an icon
 * and a sentence — never as a page still loading.
 */
describe('Election empty states', () => {
  it('[AC-US-EL-07-04] tells a team without a board how to seat one', () => {
    const wrapper = mount(BodMembersEmptyState)

    expect(wrapper.find('[data-test="bod-members-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="u-icon"]').attributes('data-icon')).toBe('i-lucide-users')
    expect(wrapper.text()).toContain('No Board of Directors yet')
    expect(wrapper.text()).toContain('Create an election and publish its results')
  })

  it('tells a team without an election to create one', () => {
    const wrapper = mount(ElectionSummaryEmptyState)

    expect(wrapper.find('[data-test="election-summary-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="u-icon"]').attributes('data-icon')).toBe('i-lucide-vote')
    expect(wrapper.text()).toContain('No current election')
  })

  it('[AC-US-EL-08-05] shows an empty history as empty, not as loading', () => {
    const wrapper = mount(PastElectionsEmptyState)

    expect(wrapper.find('[data-test="past-elections-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="u-icon"]').attributes('data-icon')).toBe('i-lucide-archive')
    expect(wrapper.text()).toContain('No past elections')
  })
})
