import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import SherTokenView from '../SherTokenView.vue'

vi.mock('@/components/sections/SherTokenView/InvestorsSection.vue', () => ({
  default: {
    name: 'InvestorsSection',
    props: ['team'],
    template: '<div data-test="investors-section">{{ team }}</div>'
  }
}))

describe('SherTokenView', () => {
  let wrapper: VueWrapper
  const mockTeam = {
    id: '1',
    name: 'Test Team',
    teamContracts: [
      {
        type: 'InvestorsV1',
        address: '0x1234567890123456789012345678901234567890'
      }
    ]
  }

  beforeEach(() => {
    wrapper = mount(SherTokenView, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              team: {
                currentTeam: mockTeam
              }
            }
          })
        ]
      }
    })
  })

  it('renders InvestorsSection component', () => {
    expect(wrapper.find('[data-test="investors-section"]').exists()).toBe(true)
  })
})
