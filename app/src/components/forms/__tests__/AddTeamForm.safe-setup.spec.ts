import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, h } from 'vue'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'
import { useCreateTeamMutation } from '@/queries/team.queries'
import { createMockMutationResponse, mockTeamData } from '@/tests/mocks/query.mock'
import { mockRouterPush } from '@/tests/mocks/router.mock'

const InvestorContractStepStub = defineComponent({
  name: 'InvestorContractStep',
  emits: ['skip', 'contractDeployed'],
  setup(_, { emit }) {
    return () =>
      h('div', [
        h('button', { 'data-test': 'skip-investor-button', onClick: () => emit('skip') }, 'Skip'),
        h(
          'button',
          { 'data-test': 'deploy-investor-button', onClick: () => emit('contractDeployed') },
          'Deploy'
        )
      ])
  }
})

const SafeDeploymentCardStub = defineComponent({
  name: 'SafeDeploymentCard',
  props: ['teamId', 'teamOwnerAddress'],
  emits: ['safeDeployed'],
  setup(_, { emit }) {
    return () =>
      h(
        'button',
        {
          'data-test': 'deploy-safe-button',
          onClick: () => emit('safeDeployed', '0x1111111111111111111111111111111111111111')
        },
        'Deploy Safe Wallet'
      )
  }
})

const SafeImportCardStub = defineComponent({
  name: 'SafeImportCard',
  props: ['teamId', 'teamOwnerAddress'],
  emits: ['safe-imported'],
  setup(_, { emit }) {
    return () =>
      h(
        'button',
        {
          'data-test': 'confirm-safe-import-button',
          onClick: () => emit('safe-imported', '0x1111111111111111111111111111111111111111')
        },
        'Import Safe'
      )
  }
})

const MultiSelectMemberInputStub = defineComponent({
  name: 'MultiSelectMemberInput',
  props: ['modelValue', 'disableTeamMembers'],
  emits: ['update:modelValue'],
  setup() {
    return () => h('div')
  }
})

const SELECTORS = {
  step4: '[data-test="step-4"]',
  deployInvestorButton: '[data-test="deploy-investor-button"]',
  skipInvestorButton: '[data-test="skip-investor-button"]',
  chooseDeploySafeButton: '[data-test="choose-deploy-safe-button"]',
  chooseImportSafeButton: '[data-test="choose-import-safe-button"]',
  deploySafeButton: '[data-test="deploy-safe-button"]',
  importSafeButton: '[data-test="confirm-safe-import-button"]',
  skipSafeSetupButton: '[data-test="skip-safe-setup-button"]'
} as const

describe('AddTeamForm Safe setup', () => {
  let wrapper: VueWrapper | undefined

  const mountComponent = () =>
    mount(AddTeamForm, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          InvestorContractStep: InvestorContractStepStub,
          SafeDeploymentCard: SafeDeploymentCardStub,
          SafeImportCard: SafeImportCardStub,
          MultiSelectMemberInput: MultiSelectMemberInputStub
        }
      }
    })

  const goToSafeSetup = async (advanceInvestorStep = true) => {
    vi.mocked(useCreateTeamMutation).mockReturnValue(
      createMockMutationResponse(mockTeamData) as ReturnType<typeof useCreateTeamMutation>
    )
    wrapper = mountComponent()
    await wrapper.get('[data-test="team-name-input"]').setValue('Test Team')
    await wrapper.get('[data-test="team-description-input"]').setValue('A test team')
    await wrapper.vm.$nextTick()
    await wrapper.find('form[data-test="step-1"]').trigger('submit.prevent')
    await flushPromises()
    await wrapper.get('[data-test="create-team-button"]').trigger('click')
    await flushPromises()
    await wrapper
      .get(advanceInvestorStep ? SELECTORS.deployInvestorButton : SELECTORS.skipInvestorButton)
      .trigger('click')
    await flushPromises()
    return wrapper
  }

  const chooseSafeSetup = async (choice: 'deploy' | 'import') => {
    await wrapper!
      .get(
        choice === 'deploy' ? SELECTORS.chooseDeploySafeButton : SELECTORS.chooseImportSafeButton
      )
      .trigger('click')
    await flushPromises()
  }

  beforeEach(() => vi.clearAllMocks())
  afterEach(() => wrapper?.unmount())

  it('offers deployment, import, and skip after the investor step is skipped', async () => {
    await goToSafeSetup(false)

    expect(wrapper!.find(SELECTORS.step4).exists()).toBe(true)
    expect(wrapper!.find(SELECTORS.chooseDeploySafeButton).exists()).toBe(true)
    expect(wrapper!.find(SELECTORS.chooseImportSafeButton).exists()).toBe(true)
    expect(wrapper!.find(SELECTORS.skipSafeSetupButton).exists()).toBe(true)
  })

  it('shows the deployment flow and passes the new team owner after choosing deployment', async () => {
    await goToSafeSetup()
    await chooseSafeSetup('deploy')

    const safeDeployment = wrapper!.findComponent({ name: 'SafeDeploymentCard' })
    expect(safeDeployment.props('teamId')).toBe(Number(mockTeamData.id))
    expect(safeDeployment.props('teamOwnerAddress')).toBe(mockTeamData.ownerAddress)
  })

  it('navigates to the team after the new Safe is deployed', async () => {
    await goToSafeSetup()
    await chooseSafeSetup('deploy')
    await wrapper!.get(SELECTORS.deploySafeButton).trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith(`/teams/${mockTeamData.id}`)
  })

  it('shows the import flow and passes the new team owner after choosing import', async () => {
    await goToSafeSetup()
    await chooseSafeSetup('import')

    const safeImport = wrapper!.findComponent({ name: 'SafeImportCard' })
    expect(safeImport.props('teamId')).toBe(Number(mockTeamData.id))
    expect(safeImport.props('teamOwnerAddress')).toBe(mockTeamData.ownerAddress)
  })

  it('navigates to the team after an existing Safe is imported', async () => {
    await goToSafeSetup()
    await chooseSafeSetup('import')
    await wrapper!.get(SELECTORS.importSafeButton).trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith(`/teams/${mockTeamData.id}`)
  })

  it('navigates to the team when Safe setup is skipped', async () => {
    await goToSafeSetup()
    await wrapper!.get(SELECTORS.skipSafeSetupButton).trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith(`/teams/${mockTeamData.id}`)
  })
})
