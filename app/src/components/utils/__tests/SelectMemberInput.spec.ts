import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { it, describe, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'

describe('SelectMemberInput.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  beforeEach(() => {
    vi.useFakeTimers()
    const input = ref({
      name: '',
      address: ''
    })
    wrapper = mount(SelectMemberInput, {
      props: {
        modelValue: input.value
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  vi.mock('@/composables/useCustomFetch', () => {
    return {
      useCustomFetch: vi.fn(() => ({
        get: () => ({
          json: () => {
            const data = ref({
              users: [
                { address: '0x123', name: 'John Doe' },
                { address: '0x456', name: 'Jane DoeV2' }
              ]
            })
            return {
              execute: vi.fn().mockImplementation(() => {
                return Promise.resolve(data.value)
              }),
              data,
              loading: ref(false),
              error: ref<unknown>(null)
            }
          }
        })
      }))
    }
  })

  it.skip('should render correctly, show dropdown after mount and emit event on select', async () => {
    const nameInput = wrapper.find('[data-test="member-name-input"]')
    expect(nameInput.exists()).toBe(true)

    // After mount with autoOpen, dropdown should appear once data is loaded
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="user-dropdown"]').exists()).toBe(true)

    // Focus the name input and type to simulate search
    await nameInput.trigger('focus')
    await nameInput.setValue('John')
    await wrapper.vm.$nextTick()
    // Wait for debounce
    await vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    expect(
      (wrapper.props() as { modelValue: { name: string; address: string } }).modelValue.name
    ).toBe('John')
    expect(wrapper.find('[data-test="user-dropdown"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('John Doe')

    // Test selecting user
    const item = wrapper.find('[data-test="user-dropdown-0x123"]')
    await item.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted()).toHaveProperty('selectMember')
    const emittedEvents = wrapper.emitted().selectMember as unknown as Array<
      Array<{ address: string; name: string }>
    >
    expect(emittedEvents[0][0]).toEqual({ address: '0x123', name: 'John Doe' })
  })

  it('should filter out excluded addresses from the dropdown', async () => {
    const input = ref({ name: '', address: '' })
    const localWrapper = mount(SelectMemberInput, {
      props: {
        modelValue: input.value,
        excludeAddresses: ['0x123']
      }
    })

    await localWrapper.vm.$nextTick()

    const dropdown = localWrapper.find('[data-test="user-dropdown"]')
    expect(dropdown.exists()).toBe(true)
    expect(dropdown.text()).not.toContain('0x123')
    expect(dropdown.text()).toContain('0x456')
  })
})
