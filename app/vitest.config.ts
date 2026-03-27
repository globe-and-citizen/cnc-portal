import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'

import { fileURLToPath } from 'node:url'
import viteConfig from './vite.config'
import { defineComponent, h } from 'vue'

import dotenv from 'dotenv'

dotenv.config()
process.env.TZ = 'UTC'
const mockFiles = [
  'store',
  'composables',
  'wagmi.vue',
  'viem',
  'erc20',
  'elections',
  'bank',
  'treasury',
  'bod',
  'investor',
  'nuxt-ui'
].map((name) => `./src/tests/setup/${name}.setup.ts`)

// Global stubs for @nuxt/ui components
const UButtonStub = defineComponent({
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

const UIconStub = defineComponent({
  name: 'UIcon',
  props: ['name', 'size', 'class'],
  setup(props) {
    return () => h('span', { 'data-test': 'u-icon', class: props.class }, props.name)
  }
})

const UDropdownStub = defineComponent({
  name: 'UDropdown',
  props: ['items', 'popper', 'modelValue'],
  emits: ['update:modelValue', 'select'],
  setup(props, { slots }) {
    return () => h('div', { 'data-test': 'u-dropdown' }, slots.default ? slots.default() : null)
  }
})

const UModalStub = defineComponent({
  name: 'UModal',
  props: ['open', 'close', 'title'],
  emits: ['update:open'],
  setup(props, { slots }) {
    return () =>
      props.open
        ? h('div', { 'data-test': 'u-modal', role: 'dialog' }, [
            props.title ? h('h2', props.title) : null,
            slots.body ? slots.body() : slots.default ? slots.default() : null
          ])
        : null
  }
})

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      setupFiles: mockFiles,
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'test/e2e/*', 'constant/*'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'istanbul',
        exclude: ['./src/tests/*'],
        enabled: process.env.VITE_ENABLE_COVERAGE
          ? (process.env.VITE_ENABLE_COVERAGE as unknown as boolean)
          : false
      },
      env: {
        VITE_APP_NETWORK_ALIAS: 'sepolia'
      },
      globals: true,
      global: {
        stubs: {
          UButton: UButtonStub,
          UIcon: UIconStub,
          UDropdown: UDropdownStub,
          UModal: UModalStub
        }
      }
    }
  })
)
