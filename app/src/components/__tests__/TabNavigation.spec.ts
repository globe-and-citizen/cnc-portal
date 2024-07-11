import { mount } from '@vue/test-utils'
import TabNavigation from '@/components/TabNavigation.vue'
import { describe, expect, it } from 'vitest'

describe('TabNavigation', () => {
  it('renders the correct number of tabs', () => {
    const wrapper = mount(TabNavigation, {
      props: {
        tabs: ['Tab 1', 'Tab 2', 'Tab 3']
      }
    })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.length).toBe(3)
  })

  it('sets the initial active tab correctly', () => {
    const wrapper = mount(TabNavigation, {
      props: {
        tabs: ['Tab 1', 'Tab 2', 'Tab 3'],
        modelValue: 1
      }
    })

    const activeTab = wrapper.find('[role="tab"].tab-active')
    expect(activeTab.text()).toBe('Tab 2')
  })

  it('changes the active tab when a different tab is clicked', async () => {
    const wrapper = mount(TabNavigation, {
      props: {
        tabs: ['Tab 1', 'Tab 2', 'Tab 3']
      }
    })

    const tabs = wrapper.findAll('[role="tab"]')

    // Initially the first tab should be active
    expect(wrapper.find('[role="tab"].tab-active').text()).toBe('Tab 1')

    // Click the second tab
    await tabs[1].trigger('click')

    // Check if the second tab is now active
    expect(wrapper.find('[role="tab"].tab-active').text()).toBe('Tab 2')
  })

  it('renders slot content for each tab', async () => {
    const wrapper = mount(TabNavigation, {
      props: {
        tabs: ['Tab 1', 'Tab 2', 'Tab 3']
      },
      slots: {
        'tab-0': '<div class="slot-content-0">Content for Tab 1</div>',
        'tab-1': '<div class="slot-content-1">Content for Tab 2</div>',
        'tab-2': '<div class="slot-content-2">Content for Tab 3</div>'
      }
    })

    const tabs = wrapper.findAll('[role="tab"]')

    // Initially the first tab content should be visible
    expect(wrapper.find('.slot-content-0').text()).toBe('Content for Tab 1')

    // Click the second tab
    await tabs[1].trigger('click')

    // Check if the second tab content is now visible
    expect(wrapper.find('.slot-content-1').text()).toBe('Content for Tab 2')

    // Click the third tab
    await tabs[2].trigger('click')

    // Check if the third tab content is now visible
    expect(wrapper.find('.slot-content-2').text()).toBe('Content for Tab 3')
  })
})
