import { mount as originalMount, VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { TooltipProvider } from 'reka-ui'
import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Module-level mocks for @nuxt/ui components
// ---------------------------------------------------------------------------

// UModal teleports slots to <body> in the real implementation, which hides
// slot content from wrapper.find(). This mock renders all slots inline and
// provides a close button replicating UModal's built-in dismiss control.
vi.mock('@nuxt/ui/components/Modal.vue', () => ({
  default: {
    name: 'UModal',
    props: {
      open: { type: Boolean, default: false },
      ui: Object,
      title: String,
      description: String
    },
    emits: ['update:open'],
    template: `
      <div>
        <slot />
        <div v-if="open">
          <button data-test="close-wage-modal-button" @click="$emit('update:open', false)" />
          <slot name="header" />
          <slot name="body" />
        </div>
      </div>
    `
  }
}))

// UTooltip requires a TooltipProvider ancestor injected via context. Stubbing
// the module avoids the "Injection not found" error in unit tests.
vi.mock('@nuxt/ui/components/Tooltip.vue', () => ({
  default: {
    name: 'UTooltip',
    props: ['text', 'content'],
    template: '<div><slot /></div>'
  }
}))

/**
 * Global test utilities for Nuxt UI components
 * Provides TooltipProvider context automatically for all tests
 * Includes global stubs for auto-imported @nuxt/ui components
 */

declare global {
  var mockTooltipProvider: ReturnType<typeof defineComponent>
}

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
