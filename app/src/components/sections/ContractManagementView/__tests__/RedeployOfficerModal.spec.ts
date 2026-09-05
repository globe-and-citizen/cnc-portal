import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import RedeployOfficerModal from '@/components/sections/ContractManagementView/RedeployOfficerModal.vue'
import type {
  OfficerRedeployFailure,
  OfficerRedeployMigrationRecovery
} from '@/composables/contracts/useOfficerRedeploy'
import { renderWithProviders } from '@/tests/mocks'

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
  failure: ref<OfficerRedeployFailure | null>(null),
  migrationRecovery: ref<OfficerRedeployMigrationRecovery | null>(null)
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
    emits: ['submit'],
    methods: {
      submit() {
        const result = this.schema?.safeParse(this.state)
        if (!this.schema || result.success) this.$emit('submit')
      }
    },
    template: '<form @submit.prevent="submit"><slot /></form>'
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
  return renderWithProviders(RedeployOfficerModal, {
    props: {
      open: true,
      ...props
    },
    global: { stubs }
  })
}

describe('RedeployOfficerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedeployState.isRunning.value = false
    mockRedeployState.failure.value = null
    mockRedeployState.migrationRecovery.value = null
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

  it('rejects whitespace-only names and symbols at the form boundary', async () => {
    const wrapper = mountModal({ open: true })
    await flushPromises()

    await wrapper.find('[data-test="redeploy-share-name-input"]').setValue('   ')
    await wrapper.find('[data-test="redeploy-share-symbol-input"]').setValue('SHR')

    expect(
      wrapper.findComponent('[data-test="confirm-redeploy-contracts"]').props('disabled')
    ).toBe(true)

    await wrapper.find('form').trigger('submit')

    expect(mockRedeployState.redeploy).not.toHaveBeenCalled()
  })

  it('calls redeploy with the current form values on confirm', async () => {
    const wrapper = mountModal({ open: true })
    await flushPromises()

    await wrapper.find('[data-test="redeploy-share-name-input"]').setValue('New Co SHER')
    await wrapper.find('[data-test="redeploy-share-symbol-input"]').setValue('NCS')
    await wrapper.find('form').trigger('submit')
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
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('update:open')?.some((e) => e[0] === false)).toBe(true)
  })

  it('keeps the modal open when deployError is set', async () => {
    mockRedeployState.failure.value = { stage: 'deploy', error: new Error('deploy boom') }
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
    mockRedeployState.failure.value = {
      stage: 'registration',
      error: new Error('register boom')
    }
    const wrapper = mountModal({ open: true })
    await flushPromises()

    expect(wrapper.find('[data-test="register-error-alert"]').exists()).toBe(true)
  })

  it('renders workflow-error alert when workflowError is set', async () => {
    mockRedeployState.failure.value = {
      stage: 'workflow',
      error: new Error('workflow boom')
    }
    const wrapper = mountModal({ open: true })
    await flushPromises()

    expect(wrapper.find('[data-test="workflow-error-alert"]').exists()).toBe(true)
  })

  it('renders migration-error alert and retry button when migrationFailed', async () => {
    mockRedeployState.migrationRecovery.value = { error: new Error('mint boom') }
    const wrapper = mountModal({ open: true })
    await flushPromises()

    expect(wrapper.find('[data-test="migration-error-alert"]').exists()).toBe(true)
    const retry = wrapper.find('[data-test="retry-migration"]')
    expect(retry.exists()).toBe(true)

    await retry.trigger('click')
    await flushPromises()
    expect(mockRedeployState.retryMigration).toHaveBeenCalledTimes(1)
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
    mockRedeployState.migrationRecovery.value = { error: new Error('mint boom') }
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
