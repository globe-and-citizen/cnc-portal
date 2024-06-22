import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabNavigation from '@/components/TabNavigation.vue'
import { SingleTeamTabs } from '@/types'

describe('TabNavigation', () => {
  it('renders tabs correctly and handles tab click', async () => {
    const tabs = [SingleTeamTabs.Members, SingleTeamTabs.Transactions, SingleTeamTabs.Bank]
    const activeTab = SingleTeamTabs.Members

    const wrapper = mount(TabNavigation, {
      props: {
        tabs,
        activeTab
      }
    })

    // Check if the tabs are rendered correctly
    const tabElements = wrapper.findAll('[role="tab"]')
    expect(tabElements).toHaveLength(tabs.length)
    tabElements.forEach((tab, index) => {
      expect(tab.text()).toBe(tabs[index])
    })

    // Check if the active tab is highlighted correctly
    const activeTabElement = wrapper.find('.tab-active')
    expect(activeTabElement.text()).toBe(activeTab)

    // Simulate a click on the second tab (Transactions)
    await tabElements[1].trigger('click')

    // Check if the 'setTab' event has been emitted with the correct payload
    expect(wrapper.emitted('setTab')).toBeTruthy()
    expect(wrapper.emitted('setTab')![0]).toEqual([SingleTeamTabs.Transactions])
  })
})
