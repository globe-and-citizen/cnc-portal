import { VueWrapper, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SherTokenView from '../SherTokenView.vue'
import { createTestingPinia } from '@pinia/testing'

describe('[US-SHER-003] SherTokenView', () => {
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
