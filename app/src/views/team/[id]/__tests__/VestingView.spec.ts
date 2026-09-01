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
  it('renders the vesting hero without an implementation-version label', () => {
    const wrapper = mount(VestingView)
    expect(wrapper.text()).not.toContain('V2')
    expect(wrapper.findComponent(VestingStats).exists()).toBe(true)
    expect(wrapper.findComponent(VestingFlow).exists()).toBe(true)
  })

  it('refreshes the shared read model only for an explicit retry', () => {
    const wrapper = mount(VestingView)
    wrapper.getComponent(VestingFlow).vm.$emit('retry')
    expect(refetch).toHaveBeenCalledOnce()
  })
})
