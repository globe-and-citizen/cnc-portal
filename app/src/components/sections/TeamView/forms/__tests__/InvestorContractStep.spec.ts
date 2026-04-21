import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import InvestorContractStep from '@/components/sections/TeamView/forms/InvestorContractStep.vue'
import { mockTeamData } from '@/tests/mocks'

// ---------------------------------------------------------------------------
// Hoisted mutation state so tests can flip isPending / error per-case while
// keeping a single stable vi.fn() reference for mutate assertions.
// ---------------------------------------------------------------------------

const mockDeployMutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue({
    officerAddress: '0xOfficer',
    deployBlockNumber: 1n,
    deployedAt: new Date('2026-01-01T00:00:00Z')
  }),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref(null),
  reset: vi.fn()
}

const mockRegisterMutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue({ previousOfficer: null }),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref(null),
  reset: vi.fn()
}

const mockInvalidateOfficerQueries = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/contracts', () => ({
  useDeployOfficer: vi.fn(() => mockDeployMutation),
  useInvalidateOfficerQueries: vi.fn(() => mockInvalidateOfficerQueries),
  formatDeployError: vi.fn((err: Error | null) => err?.message ?? '')
}))

vi.mock('@/queries/contract.queries', () => ({
  useCreateOfficerMutation: vi.fn(() => mockRegisterMutation),
  useCreateContractMutation: vi.fn(() => mockRegisterMutation),
  useSyncContractsMutation: vi.fn(() => mockRegisterMutation)
}))

// Local stubs for the @nuxt/ui form primitives.
const stubs = {
  UForm: {
    name: 'UForm',
    props: ['state', 'schema'],
    emits: ['submit'],
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
      '<div :data-test-alert-color="color" :data-test-alert-title="title" v-bind="$attrs"><span>{{ description }}</span></div>'
  }
}

function mountStep(props: Partial<{ showAlert: boolean; showSkip: boolean }> = {}) {
  return mount(InvestorContractStep, {
    props: {
      team: mockTeamData,
      ...props
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs
    }
  })
}

describe('InvestorContractStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeployMutation.isPending.value = false
    mockDeployMutation.isError.value = false
    mockDeployMutation.error.value = null
    mockRegisterMutation.isPending.value = false
    mockRegisterMutation.isError.value = false
    mockRegisterMutation.error.value = null

    // Default: the mutation invokes the onSuccess callback synchronously so
    // the chain (deploy -> register -> invalidate -> emit) runs end-to-end.
    mockDeployMutation.mutate.mockImplementation(
      (
        _vars: unknown,
        opts?: {
          onSuccess?: (data: {
            officerAddress: string
            deployBlockNumber: bigint
            deployedAt: Date
          }) => void | Promise<void>
        }
      ) => {
        return opts?.onSuccess?.({
          officerAddress: '0xOfficer',
          deployBlockNumber: 1n,
          deployedAt: new Date('2026-01-01T00:00:00Z')
        })
      }
    )
    mockRegisterMutation.mutate.mockImplementation(
      (_vars: unknown, opts?: { onSuccess?: () => void | Promise<void> }) => {
        return opts?.onSuccess?.()
      }
    )
  })

  it('renders the name/symbol inputs and the deploy button', () => {
    const wrapper = mountStep()
    expect(wrapper.find('[data-test="share-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="share-symbol-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="deploy-contracts-button"]').exists()).toBe(true)
  })

  it('does not render the skip button by default', () => {
    const wrapper = mountStep()
    expect(wrapper.find('[data-test="skip-button"]').exists()).toBe(false)
  })

  it('renders the skip button when showSkip is true and emits skip on click', async () => {
    const wrapper = mountStep({ showSkip: true })
    const skip = wrapper.find('[data-test="skip-button"]')
    expect(skip.exists()).toBe(true)

    await skip.trigger('click')
    expect(wrapper.emitted('skip')).toBeTruthy()
  })

  it('disables the deploy button until both fields are filled', async () => {
    const wrapper = mountStep()
    const btn = wrapper.findComponent('[data-test="deploy-contracts-button"]')
    expect(btn.props('disabled')).toBe(true)

    await wrapper.find('[data-test="share-name-input"]').setValue('Company SHER')
    expect(btn.props('disabled')).toBe(true)

    await wrapper.find('[data-test="share-symbol-input"]').setValue('SHR')
    expect(btn.props('disabled')).toBe(false)
  })

  it('calls deployMutation.mutate with input + teamId on submit and emits contractDeployed', async () => {
    const wrapper = mountStep()
    await wrapper.find('[data-test="share-name-input"]').setValue('Co SHER')
    await wrapper.find('[data-test="share-symbol-input"]').setValue('CSHR')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockDeployMutation.mutate).toHaveBeenCalledTimes(1)
    const [vars] = mockDeployMutation.mutate.mock.calls[0]
    expect(vars).toEqual({
      investorInput: { name: 'Co SHER', symbol: 'CSHR' },
      teamId: mockTeamData.id
    })

    expect(mockRegisterMutation.mutate).toHaveBeenCalledTimes(1)
    expect(mockInvalidateOfficerQueries).toHaveBeenCalledWith(mockTeamData.id)
    expect(wrapper.emitted('contractDeployed')).toBeTruthy()
  })

  it('shows loading state on the deploy button while the deploy mutation is pending', async () => {
    mockDeployMutation.isPending.value = true
    const wrapper = mountStep()

    const btn = wrapper.findComponent('[data-test="deploy-contracts-button"]')
    expect(btn.props('loading')).toBe(true)
    expect(btn.props('disabled')).toBe(true)
    expect(btn.props('label')).toBe('Deploying Officer Contracts...')
  })

  it('renders the deploy-error alert when deployMutation.error is set', () => {
    mockDeployMutation.error.value = new Error('deploy boom')
    const wrapper = mountStep()
    expect(wrapper.find('[data-test="deploy-error-alert"]').exists()).toBe(true)
  })

  it('renders the register-error alert when registerMutation.error is set', () => {
    mockRegisterMutation.error.value = new Error('register boom')
    const wrapper = mountStep()
    expect(wrapper.find('[data-test="register-error-alert"]').exists()).toBe(true)
  })

  it('renders the success-prompt alert when showAlert is true', () => {
    const wrapper = mountStep({ showAlert: true })
    expect(wrapper.text()).toContain(mockTeamData.name)
    expect(wrapper.text()).toContain('created')
  })

  it('hides the success-prompt alert when showAlert is false', () => {
    const wrapper = mountStep({ showAlert: false })
    expect(wrapper.text()).not.toContain('created')
  })

  it('does not emit contractDeployed if register mutation does not fire onSuccess', async () => {
    mockRegisterMutation.mutate.mockImplementation(() => {
      // no-op — simulate pending / failed register
    })
    const wrapper = mountStep()
    await wrapper.find('[data-test="share-name-input"]').setValue('Co')
    await wrapper.find('[data-test="share-symbol-input"]').setValue('C')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockRegisterMutation.mutate).toHaveBeenCalled()
    expect(wrapper.emitted('contractDeployed')).toBeFalsy()
  })
})
