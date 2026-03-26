import { mount as originalMount, VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { TooltipProvider } from 'reka-ui'

/**
 * Global test utilities for Nuxt UI components
 * Provides TooltipProvider context automatically for all tests
 * Includes global stubs for auto-imported @nuxt/ui components
 */

declare global {
  var mockTooltipProvider: ReturnType<typeof defineComponent>
}

// Global stubs for @nuxt/ui components
export const UButtonStub = defineComponent({
  name: 'UButton',
  props: [
    'loading',
    'disabled',
    'color',
    'class',
    'label',
    'icon',
    'iconTrailing',
    'size',
    'variant',
    'trailingIcon'
  ],
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          disabled: props.disabled,
          'data-test': 'u-button',
          onClick: () => emit('click')
        },
        slots.default ? slots.default() : props.label
      )
  }
})

export const UIconStub = defineComponent({
  name: 'UIcon',
  props: ['name', 'size', 'class'],
  setup(props) {
    return () => h('span', { 'data-test': 'u-icon', class: props.class }, props.name)
  }
})

export const UDropdownStub = defineComponent({
  name: 'UDropdown',
  props: ['items', 'popper', 'modelValue'],
  emits: ['update:modelValue', 'select'],
  setup(props, { slots, emit }) {
    return () => h('div', { 'data-test': 'u-dropdown' }, slots.default ? slots.default() : null)
  }
})

export const UModalStub = defineComponent({
  name: 'UModal',
  props: ['modelValue', 'title'],
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () =>
      props.modelValue
        ? h('div', { 'data-test': 'u-modal', role: 'dialog' }, [
            props.title ? h('h2', props.title) : null,
            slots.default ? slots.default() : null
          ])
        : null
  }
})

// Create a wrapper component that provides all necessary contexts
const GlobalTestWrapper = defineComponent({
  name: 'GlobalTestWrapper',
  props: {
    component: {
      type: Object as () => Component,
      required: true
    }
  },
  setup(props, { slots }) {
    return () => h(TooltipProvider, {}, () => h(props.component, {}, slots.default))
  }
})

/**
 * Custom mount helper that automatically wraps components with necessary providers
 * Usage: import { mountWithProviders } from '@/tests/setup/nuxt-ui.setup'
 */
export function mountWithProviders<T extends Component>(
  component: T,
  options: Record<string, unknown> = {}
): VueWrapper<T> {
  return originalMount(
    {
      setup() {
        return () => h(TooltipProvider, {}, () => h(component))
      }
    },
    options
  ) as VueWrapper<T>
}

// Export the wrapper component for manual use if needed
export { GlobalTestWrapper }

// Keep global reference for backward compatibility with existing tests
globalThis.mockTooltipProvider = defineComponent({
  name: 'MockTooltipProvider',
  setup(_, { slots }) {
    return () => h(TooltipProvider, {}, slots.default)
  }
})
