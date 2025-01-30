import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CashRemunerationTable from '../CashRemunerationTable.vue'

describe('CashRemunerationTable', () => {
  it('should be able to do something when approved button clicked', async () => {
    const wrapper = mount(CashRemunerationTable)
    const button = wrapper.find('[data-test="approve-button"]')

    expect(button.exists()).toBeTruthy()
    await button.trigger('click')
    // TO DO - Add more assertions
  })

  it('should be able to do something when disable button clicked', async () => {
    const wrapper = mount(CashRemunerationTable)
    const button = wrapper.find('[data-test="disable-button"]')

    expect(button.exists()).toBeTruthy()
    await button.trigger('click')
    // TO DO - Add more assertions
  })

  it('should be able to do something when enable button clicked', async () => {
    const wrapper = mount(CashRemunerationTable)
    const button = wrapper.find('[data-test="enable-button"]')

    expect(button.exists()).toBeTruthy()
    await button.trigger('click')
    // TO DO - Add more assertions
  })
})
