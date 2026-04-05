import { config, mount as originalMount, VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { TooltipProvider } from 'reka-ui'
import { vi } from 'vitest'
import {
  UButtonStub,
  UCalendarStub,
  UDropdownStub,
  UIconStub,
  USelectMenuStub
} from '../stubs/nuxt-ui.stubs'

// ---------------------------------------------------------------------------
// Module-level mocks for @nuxt/ui components
// vi.mock() intercepts the actual module import — required for components
// auto-imported by @nuxt/ui/vite that config.global.stubs cannot catch.
// ---------------------------------------------------------------------------

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

vi.mock('@nuxt/ui/components/Tooltip.vue', () => ({
  default: {
    name: 'UTooltip',
    props: ['text', 'content'],
    template: '<div><slot /></div>'
  }
}))

// SelectMenu must be vi.mock'd because config.global.stubs doesn't reliably
// catch auto-imported components resolved by @nuxt/ui/vite.
vi.mock('@nuxt/ui/components/SelectMenu.vue', async () => {
  const { USelectMenuStub } = await import('../stubs/nuxt-ui.stubs')
  return { default: USelectMenuStub }
})

// Icon vi.mock ensures the stub is applied inside other @nuxt/ui
// components that import Icon directly (e.g. Button, SelectMenu).
// Note: auto-imported UIcon from templates resolves via a different path
// (vue/components/Icon.vue) — config.global.stubs covers that case.
vi.mock('@nuxt/ui/components/Icon.vue', async () => {
  const { UIconStub } = await import('../stubs/nuxt-ui.stubs')
  return { default: UIconStub }
})

// Button vi.mock for the same reason as Icon/SelectMenu.
vi.mock('@nuxt/ui/components/Button.vue', async () => {
  const { UButtonStub } = await import('../stubs/nuxt-ui.stubs')
  return { default: UButtonStub }
})

// Calendar vi.mock — complex reka-ui dependency.
vi.mock('@nuxt/ui/components/Calendar.vue', async () => {
  const { UCalendarStub } = await import('../stubs/nuxt-ui.stubs')
  return { default: UCalendarStub }
})

// DropdownMenu vi.mock.
vi.mock('@nuxt/ui/components/DropdownMenu.vue', async () => {
  const { UDropdownStub } = await import('../stubs/nuxt-ui.stubs')
  return { default: UDropdownStub }
})

// ---------------------------------------------------------------------------
// config.global.stubs — catches components referenced by name in templates.
// Works as a fallback for components not resolved through vi.mock().
// ---------------------------------------------------------------------------
config.global.stubs = {
  ...config.global.stubs,
  // Keyed by both the auto-import name (UXxx) and the filename-inferred
  // name (Xxx) to ensure stubs apply regardless of how the component is resolved.
  UButton: UButtonStub,
  Button: UButtonStub,
  UIcon: UIconStub,
  Icon: UIconStub,
  UDropdown: UDropdownStub,
  DropdownMenu: UDropdownStub,
  USelectMenu: USelectMenuStub,
  SelectMenu: USelectMenuStub,
  UCalendar: UCalendarStub,
  Calendar: UCalendarStub
}

// ---------------------------------------------------------------------------
// Global test utilities
// ---------------------------------------------------------------------------

declare global {
  var mockTooltipProvider: ReturnType<typeof defineComponent>
}

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

export { GlobalTestWrapper }

globalThis.mockTooltipProvider = defineComponent({
  name: 'MockTooltipProvider',
  setup(_, { slots }) {
    return () => h(TooltipProvider, {}, slots.default)
  }
})
