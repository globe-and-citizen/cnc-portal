import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import CashRemunerationView from '../Accounts/CashRemunerationView.vue'
import { createTestingPinia } from '@pinia/testing'

describe('CashRemunerationView.vue', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should display contract address correctly', () => {
    const wrapper = createComponent()
    const addressTooltip = wrapper.findComponent({ name: 'AddressToolTip' })

    expect(addressTooltip.exists()).toBeTruthy()
    expect(addressTooltip.props('address')).toBe('0xTeamContractAddress')
  })

  it('should render CashRemunerationOverview component', () => {
    const wrapper = createComponent()
    const overview = wrapper.findComponent({ name: 'CashRemunerationOverview' })

    expect(overview.exists()).toBeTruthy()
  })

})
