import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import HomeView from '@/views/HomeView.vue'
import { RouterLinkStub } from '@vue/test-utils'

describe('HomeView.vue', () => {
  describe('Render', () => {
    it('should render the welcome message', () => {
      const wrapper = mount(HomeView)

      const welcomeMessage = wrapper.find('h1')
      expect(welcomeMessage.text()).toBe('Welcome To the CNC portal')
      const description = wrapper.find('p')
      expect(description.text()).toContain('Our Website is still in construction.')
    })

    it('should render the "Tip your Team" button with a RouterLink', () => {
      const wrapper = mount(HomeView, {
        global: {
          stubs: {
            RouterLink: RouterLinkStub
          }
        }
      })

      const button = wrapper.find('button')
      expect(button.text()).toBe('Tip your Team')

      const routerLink = wrapper.findComponent(RouterLinkStub)
      expect(routerLink.exists()).toBe(true)
      expect(routerLink.props().to).toBe('/teams')
    })
  })
})
