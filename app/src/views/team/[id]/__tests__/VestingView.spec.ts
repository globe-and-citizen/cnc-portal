import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import VestingView from '../VestingView.vue'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import VestingStats from '@/components/sections/VestingView/VestingStats.vue'

const refetch = vi.fn()
vi.mock('@/composables/vesting/useVestingSchedules', () => ({
  useVestingSchedules: () => ({
    schedules: ref([]),
    totals: ref({ promised: 0n, vested: 0n, claimable: 0n, released: 0n }),
    tokenSymbol: computed(() => 'SHR'),
    isLoading: ref(false),
    error: ref(null),
    refetch
  })
}))

describe('VestingView.vue', () => {
  it('renders the V2 hero, totals, and schedule flow', () => {
    const wrapper = mount(VestingView)
    expect(wrapper.text()).toContain('V2')
    expect(wrapper.findComponent(VestingStats).exists()).toBe(true)
    expect(wrapper.findComponent(VestingFlow).exists()).toBe(true)
  })

  it('refreshes the shared read model after a schedule action', () => {
    const wrapper = mount(VestingView)
    wrapper.getComponent(VestingFlow).vm.$emit('reload')
    expect(refetch).toHaveBeenCalledOnce()
  })
})
