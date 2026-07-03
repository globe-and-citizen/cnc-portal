import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import WeeklyGoalsDisplay from '../WeeklyGoalsDisplay.vue'
import type { WeeklyClaim } from '@/types'

// The real UEditor is a heavy TipTap/ProseMirror instance that is unstable under
// jsdom, so we stub it to a plain element that still surfaces the forwarded
// model value and its editable flag.
vi.mock('@nuxt/ui/components/Editor.vue', () => ({
  default: {
    name: 'UEditor',
    props: ['modelValue', 'contentType', 'editable'],
    template:
      '<div data-test="weekly-goals-content" :data-editable="String(editable)">{{ modelValue }}</div>'
  }
}))

const makeWeeklyClaim = (overrides: Partial<WeeklyClaim> = {}): WeeklyClaim =>
  ({
    id: 1,
    status: 'pending',
    weekStart: '2024-06-30T00:00:00.000Z',
    weeklyGoals: null,
    ...overrides
  }) as WeeklyClaim

const factory = (props: Record<string, unknown> = {}) =>
  mount(WeeklyGoalsDisplay, {
    props,
    global: {
      stubs: {
        UCard: { template: '<div><slot /></div>' },
        UIcon: { template: '<span />' }
      }
    }
  })

describe('WeeklyGoalsDisplay', () => {
  it('renders the memo read-only when goals are set', () => {
    const wrapper = factory({
      weeklyClaim: makeWeeklyClaim({ weeklyGoals: '## Ship it' })
    })

    const content = wrapper.get('[data-test="weekly-goals-content"]')
    expect(content.text()).toContain('## Ship it')
    expect(content.attributes('data-editable')).toBe('false')
    expect(wrapper.find('[data-test="weekly-goals-empty"]').exists()).toBe(false)
  })

  it('shows an empty state when the memo is null', () => {
    const wrapper = factory({ weeklyClaim: makeWeeklyClaim({ weeklyGoals: null }) })

    expect(wrapper.find('[data-test="weekly-goals-content"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="weekly-goals-empty"]').text()).toBe(
      'No weekly goals set for this week.'
    )
  })

  it('treats a whitespace-only memo as empty', () => {
    const wrapper = factory({ weeklyClaim: makeWeeklyClaim({ weeklyGoals: '   \n  ' }) })

    expect(wrapper.find('[data-test="weekly-goals-content"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="weekly-goals-empty"]').exists()).toBe(true)
  })

  it('shows the empty state when there is no weekly claim at all', () => {
    const wrapper = factory({})

    expect(wrapper.find('[data-test="weekly-goals-content"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="weekly-goals-empty"]').exists()).toBe(true)
  })
})
