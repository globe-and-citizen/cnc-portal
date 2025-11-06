// DropdownActions.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DropdownActions from '../WeeklyClaimActionDropdown.vue'
import type { Status } from '../WeeklyClaimActionDropdown.vue'

// Mock the dependencies
vi.mock('@iconify/vue', () => ({
  Icon: {
    template: '<span>Icon</span>'
  }
}))

vi.mock('@/components/ButtonUI.vue', () => ({
  default: {
    template: '<button><slot /></button>',
    props: ['size', 'class']
  }
}))

describe('DropdownActions', () => {
  const createWrapper = (status: Status = 'pending') => {
    return mount(DropdownActions, {
      props: {
        status
      },
      global: {
        stubs: {
          IconifyIcon: true,
          ButtonUI: true
        }
      }
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Rendering based on status', () => {
    it('renders Sign action for pending status', async () => {
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })
      expect(button.exists()).toBe(true)
      button.trigger('click')

      await flushPromises()

      expect(wrapper.text()).toContain('Sign')
      expect(wrapper.text()).not.toContain('Withdraw')
      expect(wrapper.text()).not.toContain('Disable')
    })

    it('renders Withdraw and Disable actions for signed status', async () => {
      const wrapper = createWrapper('signed')
      const button = wrapper.findComponent({ name: 'ButtonUI' })
      button.trigger('click')

      await flushPromises()

      expect(wrapper.text()).toContain('Withdraw')
      expect(wrapper.text()).toContain('Disable')
      expect(wrapper.text()).not.toContain('Sign')
      expect(wrapper.text()).not.toContain('Enable')
    })

    it('renders Enable and Resign actions for disabled status', async () => {
      const wrapper = createWrapper('disabled')
      const button = wrapper.findComponent({ name: 'ButtonUI' })
      button.trigger('click')

      await flushPromises()

      expect(wrapper.text()).toContain('Enable')
      expect(wrapper.text()).toContain('Resign')
      expect(wrapper.text()).not.toContain('Withdraw')
      expect(wrapper.text()).not.toContain('Sign')
    })

    it('renders no actions available for withdrawn status', async () => {
      const wrapper = createWrapper('withdrawn')
      const button = wrapper.findComponent({ name: 'ButtonUI' })
      button.trigger('click')

      await flushPromises()

      expect(wrapper.text()).toContain('No actions available')
      expect(wrapper.text()).not.toContain('Sign')
      expect(wrapper.text()).not.toContain('Withdraw')
    })
  })

  describe('Dropdown toggle functionality', () => {
    it('opens dropdown when button is clicked', async () => {
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      await button.trigger('click')
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(true)
      expect(wrapper.find('ul').exists()).toBe(true)
    })

    it('closes dropdown when button is clicked again', async () => {
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      // Open dropdown
      await button.trigger('click')
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(true)

      // Close dropdown
      await button.trigger('click')
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(false)
    })
  })

  describe('Action handling', () => {
    it('emits action event when menu item is clicked', async () => {
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      // Open dropdown
      await button.trigger('click')

      // Click Sign action
      const signAction = wrapper.find('a')
      await signAction.trigger('click')

      // Check that action was emitted
      expect(wrapper.emitted('action')).toBeTruthy()
      expect(wrapper.emitted('action')?.[0]).toEqual(['sign'])
    })

    it('closes dropdown after action is selected', async () => {
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      // Open dropdown
      await button.trigger('click')
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(true)

      // Click action
      const signAction = wrapper.find('a')
      await signAction.trigger('click')

      // Check dropdown is closed
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(false)
      expect(wrapper.find('ul').exists()).toBe(false)
    })

    it('emits correct actions for signed status', async () => {
      const wrapper = createWrapper('signed')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      await button.trigger('click')

      const actions = wrapper.findAll('a')
      expect(actions).toHaveLength(2)

      // Test Withdraw action
      await actions[0].trigger('click')
      expect(wrapper.emitted('action')?.[0]).toEqual(['withdraw'])

      // Reset emitted events
      wrapper.setProps({ status: 'signed' })
      await button.trigger('click')

      // Test Disable action
      const newActions = wrapper.findAll('a')
      await newActions[1].trigger('click')
      expect(wrapper.emitted('action')?.[1]).toEqual(['disable'])
    })
  })

  describe('Click outside functionality', () => {
    it('closes dropdown when clicking outside', async () => {
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      // Open dropdown
      await button.trigger('click')
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(true)

      // Advance timers to ensure event listener is set up
      vi.runAllTimers()

      // Simulate click outside
      document.dispatchEvent(new MouseEvent('click'))

      // Check dropdown is closed
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('does not close dropdown when clicking inside', async () => {
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      // Open dropdown
      await button.trigger('click')
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(true)

      // Advance timers to ensure event listener is set up
      vi.runAllTimers()

      // Simulate click inside the dropdown
      const dropdownElement = wrapper.find('ul').element
      const clickEvent = new MouseEvent('click', { bubbles: true })
      dropdownElement.dispatchEvent(clickEvent)

      // Check dropdown remains open
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(true)
    })
  })

  describe('Component lifecycle', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const wrapper = createWrapper('pending')
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('adds event listener after mount with setTimeout', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      createWrapper('pending')

      // Initially not called due to setTimeout
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('click', expect.any(Function))

      // After running timers, it should be called
      vi.runAllTimers()
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })
  })

  describe('Accessibility and UI elements', () => {
    it('renders the ellipsis button', () => {
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      expect(button.exists()).toBe(true)
    })

    it('has correct CSS classes for positioning', async () => {
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })
      await button.trigger('click')

      const menu = wrapper.find('ul')
      expect(menu.classes()).toContain('absolute')
      expect(menu.classes()).toContain('right-full')
      expect(menu.classes()).toContain('top-1/2')
    })

    it('disables action for withdrawn status', async () => {
      const wrapper = createWrapper('withdrawn')
      const button = wrapper.findComponent({ name: 'ButtonUI' })
      await button.trigger('click')

      const disabledAction = wrapper.find('a.text-gray-400')
      expect(disabledAction.exists()).toBe(true)
      expect(disabledAction.classes()).toContain('cursor-not-allowed')
    })
  })
})
