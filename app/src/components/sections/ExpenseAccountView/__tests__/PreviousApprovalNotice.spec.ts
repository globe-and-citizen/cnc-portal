import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ExpenseResponse } from '@/types/expense-account'
import PreviousApprovalNotice from '../PreviousApprovalNotice.vue'

const approval = (
  status: string,
  sourceGeneration: ExpenseResponse['sourceGeneration'] = 'previous'
) => ({ status, sourceGeneration }) as ExpenseResponse

describe('[US-EXP-004] PreviousApprovalNotice', () => {
  it('[AC-US-EXP-004-14] clears the warning after effective deactivation but keeps older-contract access', async () => {
    const wrapper = mount(PreviousApprovalNotice, {
      props: { teamId: '12', approvals: [approval('enabled')] }
    })

    expect(wrapper.find('[data-test="previous-approvals-notice"]').exists()).toBe(true)
    expect(wrapper.get('a').attributes('href')).toBe('/teams/12/contract-management?tab=history')

    await wrapper.setProps({ approvals: [approval('disabled')] })
    expect(wrapper.find('[data-test="previous-approvals-notice"]').exists()).toBe(false)
    expect(wrapper.get('a').text()).toBe('Manage older contracts')

    // An older runtime that records Disable without enforcing it is still enabled by the API.
    await wrapper.setProps({ approvals: [approval('enabled')] })
    expect(wrapper.find('[data-test="previous-approvals-notice"]').exists()).toBe(true)
  })

  it('keeps the warning hidden for finished previous approvals', () => {
    const wrapper = mount(PreviousApprovalNotice, {
      props: { teamId: '12', approvals: [approval('expired'), approval('limit-reached')] }
    })

    expect(wrapper.find('[data-test="previous-approvals-notice"]').exists()).toBe(false)
    expect(wrapper.find('a').exists()).toBe(true)
  })

  it('omits both cues when only current approvals exist', () => {
    const wrapper = mount(PreviousApprovalNotice, {
      props: { teamId: '12', approvals: [approval('enabled', 'current')] }
    })

    expect(wrapper.find('[data-test="previous-approvals-notice"]').exists()).toBe(false)
    expect(wrapper.find('a').exists()).toBe(false)
  })
})
