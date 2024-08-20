import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import LoginView from '@/views/LoginView.vue'
import { useSiwe } from '@/composables/useSiwe'
import { ref } from 'vue'

// Mock useSiwe composable
vi.mock('@/composables/useSiwe', () => ({
  useSiwe: vi.fn().mockReturnValue({
    isProcessing: false,
    siwe: vi.fn()
  })
}))

describe('LoginView.vue', () => {
  describe('Render', () => {
    it('should render the component correctly', () => {
      const wrapper = mount(LoginView)

      const logo = wrapper.find('img[alt="Logo"]')
      expect(logo.exists()).toBe(true)

      const welcomeMessage = wrapper.find('h1')
      expect(welcomeMessage.text()).toBe('Hi, Welcome back')

      const illustration = wrapper.find('img[alt="Login illustration"]')
      expect(illustration.exists()).toBe(true)

      const signInHeader = wrapper.find('h2')
      expect(signInHeader.text()).toBe('Sign in to CNC portal')

      const signInButton = wrapper.find('button[data-testid="sign-in"]')
      expect(signInButton.exists()).toBe(true)
    })
  })

  describe('Actions', () => {
    it('should call siwe when sign-in button is clicked', async () => {
      const wrapper = mount(LoginView)
      const { siwe } = useSiwe()

      const signInButton = wrapper.find('button[data-testid="sign-in"]')
      await signInButton.trigger('click')

      expect(siwe).toHaveBeenCalled()
    })

    it('should display "Processing..." when isProcessing is true', () => {
      vi.mocked(useSiwe).mockReturnValueOnce({
        isProcessing: ref<boolean>(true),
        siwe: vi.fn()
      })

      const wrapper = mount(LoginView)

      const signInButton = wrapper.find('button[data-testid="sign-in"]')
      expect(signInButton.text()).toBe('Processing...')
    })
  })
})
