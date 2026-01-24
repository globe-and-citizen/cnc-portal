import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import CashRemunerationView from '../Accounts/CashRemunerationView.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseEther } from 'viem'
import { mockTeamStore } from '@/tests/mocks/store.mock'

describe('CashRemunerationView.vue', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should pass correct props to GenericTokenHoldingsSection', () => {
    const wrapper = createComponent()
    const genericTokenHoldingSection = wrapper.findComponent({
      name: 'GenericTokenHoldingsSection'
    })

    expect(genericTokenHoldingSection.exists()).toBeTruthy()
    expect(genericTokenHoldingSection.props('address')).toBe('0xTeamContractAddress')
  })


  it('should render CashRemunerationOverview component', () => {
    const wrapper = createComponent()
    const overview = wrapper.findComponent({ name: 'CashRemunerationOverview' })

    expect(overview.exists()).toBeTruthy()
  })

})
