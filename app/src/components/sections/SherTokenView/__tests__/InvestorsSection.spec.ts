import { shallowMount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import InvestorsSection from '../InvestorsSection.vue'
import InvestorsActions from '../InvestorsActions.vue'
import ShareholderList from '../ShareholderList.vue'
import InvestorsHeader from '../InvestorsHeader.vue'

describe.skip('InvestorsSection', () => {
  let wrapper: VueWrapper<InstanceType<typeof InvestorsSection>>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  const createComponent = () => {
    return shallowMount(InvestorsSection)
  }

  describe('Component Rendering', () => {
    it('should render all required child components', () => {
      wrapper = createComponent()

      expect(wrapper.findComponent(InvestorsHeader).exists()).toBe(true)
      expect(wrapper.findComponent(InvestorsActions).exists()).toBe(true)
      expect(wrapper.findComponent(ShareholderList).exists()).toBe(true)
    })
  })
})
