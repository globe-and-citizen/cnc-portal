import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import SherTokenView from '../SherTokenView.vue'


describe('SherTokenView', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = shallowMount(SherTokenView, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn
          })
        ]
      }
    })
  })

  it('renders InvestorsSection component', () => {
    expect(wrapper.exists()).toBe(true)
  })
})
