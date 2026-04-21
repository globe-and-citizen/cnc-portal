import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import RedeployOfficerModal from '@/components/sections/ContractManagementView/RedeployOfficerModal.vue'

// ---------------------------------------------------------------------------
// Mocks for the composables used by RedeployOfficerModal. The investor reads
// are mocked globally via investor.setup.ts; here we only need to control
// useOfficerRedeploy's exposed state + actions per-test.
// ---------------------------------------------------------------------------

const mockRedeployState = {
  redeploy: vi.fn().mockResolvedValue(undefined),
  retryMigration: vi.fn().mockResolvedValue(undefined),
  skipMigration: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  isRunning: ref(false),
  migrationFailed: ref(false),
  isInconsistent: ref(false),
  deployError: ref<Error | null>(null),
  registerError: ref<Error | null>(null),
  migrationError: ref<Error | null>(null),
  workflowError: ref<Error | null>(null)
}

vi.mock('@/composables/contracts/useOfficerRedeploy', () => ({
  useOfficerRedeploy: vi.fn(() => mockRedeployState)
}))

vi.mock('@/composables/contracts/useOfficerDeployment', () => ({
  formatDeployError: vi.fn((err: Error | null) => err?.message ?? '')
}))

// Minimal stubs for the nuxt/ui form primitives used inside the modal. The
// global setup stubs cover UModal / UButton / UIcon, but not UForm, UFormField
// and UInput. Stubbing them locally avoids pulling in the real @nuxt/ui
// runtime (which relies on auto-imported helpers not available in jsdom).
const stubs = {
  UForm: {
    name: 'UForm',
    props: ['state', 'schema'],
    template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>'
  },
  UFormField: {
    name: 'UFormField',
    props: ['label', 'name', 'required', 'help'],
    template: '<div><slot /></div>'
  },
  UInput: {
    name: 'UInput',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" :placeholder="placeholder" v-bind="$attrs" @input="$emit(\'update:modelValue\', ($event.target as HTMLInputElement).value)" />'
  },
  UAlert: {
    name: 'UAlert',
    props: ['color', 'title', 'description', 'variant', 'icon'],
    template:
      '<div :data-test-alert-color="color" :data-test-alert-title="title" v-bind="$attrs"><slot name="description"><span>{{ description }}</span></slot></div>'
  }
}

function mountModal(props: { open?: boolean } = {}) {
  return mount(RedeployOfficerModal, {
    props: {
      open: true,
      ...props
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs
    }
  })
}

describe('RedeployOfficerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedeployState.isRunning.value = false
    mockRedeployState.migrationFailed.value = false
    mockRedeployState.isInconsistent.value = false
    mockRedeployState.deployError.value = null
    mockRedeployState.registerError.value = null
    mockRedeployState.migrationError.value = null
    mockRedeployState.workflowError.value = null
  })

  it('renders modal body with the redeploy form when open', async () => {
    const wrapper = mountModal({ open: true })
    await flushPromises()

    expect(wrapper.find('[data-test="redeploy-share-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="redeploy-share-symbol-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="confirm-redeploy-contracts"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cancel-redeploy-contracts"]').exists()).toBe(true)
  })

  it('does not render body when closed', () => {
    const wrapper = mountModal({ open: false })
    expect(wrapper.find('[data-test="redeploy-share-name-input"]').exists()).toBe(false)
  })

  it('disables the confirm button until both name and symbol are filled', async () => {
    const wrapper = mountModal({ open: true })
    await flushPromises()

    const confirm = wrapper.findComponent('[data-test="confirm-redeploy-contracts"]')
    expect(confirm.props('disabled')).toBe(true)

    await wrapper.find('[data-test="redeploy-share-name-input"]').setValue('Company SHER')
    expect(confirm.props('disabled')).toBe(true)

    await wrapper.find('[data-test="redeploy-share-symbol-input"]').setValue('SHR')
    expect(confirm.props('disabled')).toBe(false)
  })

  it('calls redeploy with the current form values on confirm', async () => {
    const wrapper = mountModal({ open: true })
    await flushPromises()

    await wrapper.find('[data-test="redeploy-share-name-input"]').setValue('New Co SHER')
    await wrapper.find('[data-test="redeploy-share-symbol-input"]').setValue('NCS')
    await wrapper.find('[data-test="confirm-redeploy-contracts"]').trigger('click')
    await flushPromises()

    expect(mockRedeployState.redeploy).toHaveBeenCalledTimes(1)
    expect(mockRedeployState.redeploy).toHaveBeenCalledWith({
      name: 'New Co SHER',
      symbol: 'NCS'
    })
  })

  it('closes the modal after a clean redeploy (no errors)', async () => {
    const wrapper = mountModal({ open: true })
    await flushPromises()

    await wrapper.find('[data-test="redeploy-share-name-input"]').setValue('Co')
    await wrapper.find('[data-test="redeploy-share-symbol-input"]').setValue('C')
    await wrapper.find('[data-test="confirm-redeploy-contracts"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:open')?.some((e) => e[0] === false)).toBe(true)
  })

  it('keeps the modal open when deployError is set', async () => {
    mockRedeployState.deployError.value = new Error('deploy boom')
    const wrapper = mountModal({ open: true })
    await flushPromises()

    await wrapper.find('[data-test="redeploy-share-name-input"]').setValue('Co')
    await wrapper.find('[data-test="redeploy-share-symbol-input"]').setValue('C')
    await wrapper.find('[data-test="confirm-redeploy-contracts"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:open')?.some((e) => e[0] === false)).toBeFalsy()
    expect(wrapper.find('[data-test="deploy-error-alert"]').exists()).toBe(true)
  })

  it('renders register-error alert when registerError is set', async () => {
    mockRedeployState.registerError.value = new Error('register boom')
    const wrapper = mountModal({ open: true })
    await flushPromises()

    expect(wrapper.find('[data-test="register-error-alert"]').exists()).toBe(true)
  })

  it('renders workflow-error alert when workflowError is set', async () => {
    mockRedeployState.workflowError.value = new Error('workflow boom')
    const wrapper = mountModal({ open: true })
    await flushPromises()

    expect(wrapper.find('[data-test="workflow-error-alert"]').exists()).toBe(true)
  })

  it('renders migration-error alert and retry button when migrationFailed', async () => {
    mockRedeployState.migrationFailed.value = true
    mockRedeployState.migrationError.value = new Error('mint boom')
    const wrapper = mountModal({ open: true })
    await flushPromises()

    expect(wrapper.find('[data-test="migration-error-alert"]').exists()).toBe(true)
    const retry = wrapper.find('[data-test="retry-migration"]')
    expect(retry.exists()).toBe(true)

    await retry.trigger('click')
    await flushPromises()
    expect(mockRedeployState.retryMigration).toHaveBeenCalledTimes(1)
  })

  it('disables retry button when migration is inconsistent', async () => {
    mockRedeployState.migrationFailed.value = true
    mockRedeployState.isInconsistent.value = true
    const wrapper = mountModal({ open: true })
    await flushPromises()

    const retry = wrapper.findComponent('[data-test="retry-migration"]')
    expect(retry.props('disabled')).toBe(true)
  })

  it('cancel closes the modal when no migration is pending', async () => {
    const wrapper = mountModal({ open: true })
    await flushPromises()

    await wrapper.find('[data-test="cancel-redeploy-contracts"]').trigger('click')
    await flushPromises()

    expect(mockRedeployState.skipMigration).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:open')?.some((e) => e[0] === false)).toBe(true)
  })

  it('cancel calls skipMigration when migrationFailed is true', async () => {
    mockRedeployState.migrationFailed.value = true
    const wrapper = mountModal({ open: true })
    await flushPromises()

    await wrapper.find('[data-test="cancel-redeploy-contracts"]').trigger('click')
    await flushPromises()

    expect(mockRedeployState.skipMigration).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:open')?.some((e) => e[0] === false)).toBe(true)
  })

  it('shows loading state on the confirm button when isRunning', async () => {
    mockRedeployState.isRunning.value = true
    const wrapper = mountModal({ open: true })
    await flushPromises()

    const confirm = wrapper.findComponent('[data-test="confirm-redeploy-contracts"]')
    expect(confirm.props('loading')).toBe(true)
    expect(confirm.props('disabled')).toBe(true)
  })
})
