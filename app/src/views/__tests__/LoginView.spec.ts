import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

const { sharedMutate } = vi.hoisted(() => ({ sharedMutate: vi.fn() }))
vi.mock('@/composables/useSiwe', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  return {
    useSiweMutation: vi.fn(() => ({
      mutate: sharedMutate,
      isPending: ref(false)
    }))
  }
})

import LoginView from '@/views/LoginView.vue'
import { useSiweMutation } from '@/composables/useSiwe'

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
    it('should call mutate when sign-in button is clicked', async () => {
      const wrapper = mount(LoginView)
      const { mutate } = useSiweMutation()

      const signInButton = wrapper.find('button[data-testid="sign-in"]')
      await signInButton.trigger('click')

      expect(mutate).toHaveBeenCalled()
    })

    it('should display "Processing..." when isPending is true', () => {
      vi.mocked(useSiweMutation).mockReturnValueOnce({
        mutate: vi.fn(),
        isPending: ref(true)
      } as unknown as ReturnType<typeof useSiweMutation>)

      const wrapper = mount(LoginView)

      const signInButton = wrapper.find('button[data-testid="sign-in"]')
      expect(signInButton.text()).toBe('Processing...')
    })

    it('also accepts a real ref for isPending (typing sanity)', () => {
      vi.mocked(useSiweMutation).mockReturnValueOnce({
        mutate: vi.fn(),
        isPending: ref(false)
      } as unknown as ReturnType<typeof useSiweMutation>)

      const wrapper = mount(LoginView)
      const signInButton = wrapper.find('button[data-testid="sign-in"]')
      expect(signInButton.text()).toBe('Sign In With Ethereum')
    })
  })
})
