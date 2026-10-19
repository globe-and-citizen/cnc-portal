import SelectMemberWithTokenInput from '@/components/ui/inputs/SelectMemberWithTokenInput.vue'
import { it, describe, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useTeamStore } from '@/stores'

vi.mock('@nuxt/ui/components/Select.vue', async () => ({
  default: (await import('@/tests/stubs/nuxt-ui.stubs')).USelectStub
}))

// Mock team store data
const mockLocalTeamStore = {
  currentTeam: {
    id: '1',
    name: 'Test Team',
    members: [
      { id: '1', name: 'John Doe', address: '0x123', teamId: 1 },
      { id: '2', name: 'Jane DoeV2', address: '0x456', teamId: 1 }
    ]
  },
  currentTeamMeta: {
    isPending: false
  }
}

describe('SelectMemberWithTokenInput.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useTeamStore).mockReturnValue(mockLocalTeamStore as ReturnType<typeof useTeamStore>)
    wrapper = mount(SelectMemberWithTokenInput, {
      props: {
        modelValue: {
          name: '',
          address: '',
          token: ''
        },
        tokenOptions: [{ value: '0xasset', label: 'Asset' }]
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

  it('filters members by address', async () => {
    const addressInput = wrapper.find('[data-test="member-address-input"]')

    await addressInput.trigger('focus')
    await addressInput.setValue('0x123')
    await wrapper.vm.$nextTick()

    await vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="user-dropdown"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('John Doe')
  })

  it('hides dropdown when input loses focus', async () => {
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

  it('hides dropdown after selecting a member', async () => {
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

  it('renders the Nuxt UI token selector with an accessible label', () => {
    const tokenSelector = wrapper.find('[data-test="token-selector"]')

    expect(tokenSelector.exists()).toBe(true)
    expect(tokenSelector.attributes('aria-label')).toBe('Select token')
  })

  it('renders only the token options provided by the approval policy', async () => {
    expect(wrapper.find('[data-test="token-selector"]').text()).toContain('Asset')
    await wrapper.setProps({ tokenOptions: [{ value: '0xother', label: 'Other' }] })
    expect(wrapper.find('[data-test="token-selector"]').text()).toContain('Other')
    expect(wrapper.find('[data-test="token-selector"]').text()).not.toContain('Asset')
  })
})
