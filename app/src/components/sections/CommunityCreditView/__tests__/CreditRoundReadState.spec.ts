import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useQueryClientFn } from '@/tests/mocks'
import CreditRoundReadState from '../CreditRoundReadState.vue'

const mockRefetchQueries = vi.fn().mockResolvedValue(undefined)

describe('CreditRoundReadState', () => {
  beforeEach(() => {
    mockRefetchQueries.mockClear()
    useQueryClientFn.mockReturnValue({ refetchQueries: mockRefetchQueries })
  })

  function mountState(props: { hasRound: boolean; isLoading: boolean; isError: boolean }) {
    return mount(CreditRoundReadState, { props })
  }

  it('announces initial loading without presenting the round as absent', () => {
    const wrapper = mountState({ hasRound: false, isLoading: true, isError: false })

    expect(wrapper.find('[data-test="round-loading"]').attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('Loading credit round')
    expect(wrapper.find('[data-test="round-not-found"]').exists()).toBe(false)
  })

  it('offers a scoped retry when the round read fails', async () => {
    const wrapper = mountState({ hasRound: false, isLoading: false, isError: true })

    expect(wrapper.find('[data-test="round-error"]').exists()).toBe(true)
    await wrapper.find('[data-test="round-error-retry"]').trigger('click')
    expect(mockRefetchQueries).toHaveBeenCalledWith({ queryKey: ['fixedReturnAllOffers'] })
  })

  it('marks cached details as outdated without hiding them', () => {
    const wrapper = mountState({ hasRound: true, isLoading: false, isError: true })

    expect(wrapper.find('[data-test="round-refresh-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="round-error"]').exists()).toBe(false)
  })

  it('offers an explicit route recovery only after a confirmed missing round', async () => {
    const wrapper = mountState({ hasRound: false, isLoading: false, isError: false })

    expect(wrapper.find('[data-test="round-not-found"]').exists()).toBe(true)
    await wrapper.find('[data-test="round-not-found-back"]').trigger('click')
    expect(wrapper.emitted('back')).toEqual([[]])
  })
})
