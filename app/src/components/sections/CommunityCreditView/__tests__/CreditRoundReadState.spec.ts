import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useQueryClientFn } from '@/tests/mocks'
import { fixedReturnKeys } from '@/composables/fixedReturn/reads'
import CreditRoundReadState from '../CreditRoundReadState.vue'

const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined)

describe('CreditRoundReadState', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockClear()
    useQueryClientFn.mockReturnValue({ invalidateQueries: mockInvalidateQueries })
  })

  function mountState(props: { hasRound: boolean; isLoading: boolean; isError: boolean }) {
    return mount(CreditRoundReadState, { props })
  }

  it('[AC-US-CC-001-07] presents initial loading without claiming the round is missing', () => {
    const wrapper = mountState({ hasRound: false, isLoading: true, isError: false })

    expect(wrapper.find('[data-test="round-loading"]').attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('Loading credit round')
    expect(wrapper.find('[data-test="round-not-found"]').exists()).toBe(false)
  })

  it('[AC-US-CC-001-07] offers a scoped retry when the round read fails', async () => {
    const wrapper = mountState({ hasRound: false, isLoading: false, isError: true })

    expect(wrapper.find('[data-test="round-error"]').exists()).toBe(true)
    await wrapper.find('[data-test="round-error-retry"]').trigger('click')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: fixedReturnKeys.all })
  })

  it('[AC-US-CC-001-07] marks cached round details as outdated without hiding them', () => {
    const wrapper = mountState({ hasRound: true, isLoading: false, isError: true })

    expect(wrapper.find('[data-test="round-refresh-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="round-error"]').exists()).toBe(false)
  })

  it('[AC-US-CC-001-07] offers route recovery after a confirmed missing round', async () => {
    const wrapper = mountState({ hasRound: false, isLoading: false, isError: false })

    expect(wrapper.find('[data-test="round-not-found"]').exists()).toBe(true)
    await wrapper.find('[data-test="round-not-found-back"]').trigger('click')
    expect(wrapper.emitted('back')).toEqual([[]])
  })
})
