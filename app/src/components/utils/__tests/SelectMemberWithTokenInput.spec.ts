import SelectMemberWithTokenInput from '@/components/utils/SelectMemberWithTokenInput.vue'
import { it, describe, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import { createTestingPinia } from '@pinia/testing'

// Mock team store data
const mockTeamStore = {
  currentTeam: {
    id: '1',
    name: 'Test Team',
    members: [
      { id: '1', name: 'John Doe', address: '0x123', teamId: 1 },
      { id: '2', name: 'Jane DoeV2', address: '0x456', teamId: 1 }
    ]
  },
  currentTeamMeta: {
    teamIsFetching: false
  }
}

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

describe('SelectMemberWithTokenInput.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  beforeEach(() => {
    vi.useFakeTimers()
    wrapper = mount(SelectMemberWithTokenInput, {
      props: {
        modelValue: {
          name: '',
          address: '',
          token: ''
        }
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    if (wrapper) wrapper.unmount()
  })

  it('should filter members by address', async () => {
    const addressInput = wrapper.find('[data-test="member-address-input"]')

    await addressInput.trigger('focus')
    await addressInput.setValue('0x123')
    await wrapper.vm.$nextTick()

    await vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="user-dropdown"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('John Doe')
  })

  it('should hide dropdown when input loses focus', async () => {
    const nameInput = wrapper.find('[data-test="member-name-input"]')

    await nameInput.trigger('focus')
    await wrapper.vm.$nextTick()

    await vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="user-dropdown"]').exists()).toBe(true)

    await nameInput.trigger('blur')
    await wrapper.vm.$nextTick()

    await vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="user-dropdown"]').exists()).toBe(false)
  })

  it('should hide dropdown after selecting a member', async () => {
    const nameInput = wrapper.find('[data-test="member-name-input"]')

    await nameInput.trigger('focus')
    await nameInput.setValue('John')
    await wrapper.vm.$nextTick()

    await vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="user-dropdown"]').exists()).toBe(true)

    const userItem = wrapper.find('[data-test="user-dropdown-0x123"]')
    await userItem.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="user-dropdown"]').exists()).toBe(false)
  })
})
