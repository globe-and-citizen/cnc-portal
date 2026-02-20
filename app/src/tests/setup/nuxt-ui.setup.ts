import { mount as originalMount, VueWrapper } from '@vue/test-utils'
import { defineComponent, h, Component } from 'vue'
import { TooltipProvider } from 'reka-ui'

/**
 * Global test utilities for Nuxt UI components
 * Provides TooltipProvider context automatically for all tests
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
export function mountWithProviders<T extends Component>(component: T, options: Record<string, unknown> = {}): VueWrapper<T> {
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
