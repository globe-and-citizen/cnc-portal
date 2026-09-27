import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Icon } from '@iconify/vue'
import ElectionStatsCard from '../ElectionStatsCard.vue'

describe('ElectionStatsCard', () => {
  it('renders the title, the figure and the solid heroicon', () => {
    const wrapper = mount(ElectionStatsCard, {
      props: { data: '3 / 6', icon: 'users', color: 'primary', title: 'Seat/Candidates' }
    })

    expect(wrapper.text()).toContain('Seat/Candidates')
    expect(wrapper.text()).toContain('3 / 6')
    expect(wrapper.findComponent(Icon).props('icon')).toBe('heroicons:users-solid')
  })
})
