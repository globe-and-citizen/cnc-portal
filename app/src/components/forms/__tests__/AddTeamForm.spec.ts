import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'
import { useCreateTeamMutation } from '@/queries/team.queries'
import { createMockMutationResponse, mockTeamData } from '@/tests/mocks/query.mock'
import { mockRouterPush } from '@/tests/mocks/router.mock'
import { defineComponent, h } from 'vue'

// Stub for InvestorContractStep — step 3 is delegated to this component
const InvestorContractStepStub = defineComponent({
  name: 'InvestorContractStep',
  props: ['team', 'showAlert', 'showSkip'],
  emits: ['skip', 'contractDeployed'],
  setup(_, { emit }) {
    return () =>
      h('div', [
        h('button', { 'data-test': 'skip-button', onClick: () => emit('skip') }, 'Skip for now'),
        h(
          'button',
          { 'data-test': 'deploy-contract-button', onClick: () => emit('contractDeployed') },
          'Deploy Contracts'
        )
      ])
  }
})

const MultiSelectMemberInputStub = defineComponent({
  name: 'MultiSelectMemberInput',
  props: ['modelValue', 'disableTeamMembers'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-test': 'multi-select-stub',
        onClick: () => emit('update:modelValue', props.modelValue)
      })
  }
})

// Test selectors
const SELECTORS = {
  teamNameInput: '[data-test="team-name-input"]',
  teamDescriptionInput: '[data-test="team-description-input"]',
  deployContractButton: '[data-test="deploy-contract-button"]',
  skipButton: '[data-test="skip-button"]',
  createTeamError: '[data-test="create-team-error"]'
} as const

type AddTeamFormVm = {
  teamData: { name: string; description: string; members: Array<{ address: string; name: string }> }
  currentStep: number
  canProceed: boolean
  stepperItems: Array<{ title: string; value: number }>
  nextStep: () => void
  saveTeamToDatabase: () => Promise<void>
}

describe('AddTeamForm.vue', () => {
  let wrapper: ReturnType<typeof mount>

  const mountComponent = () => {
    return mount(AddTeamForm, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          InvestorContractStep: InvestorContractStepStub,
          MultiSelectMemberInput: MultiSelectMemberInputStub
        }
      }
    })
  }

  // Navigate to step 2 by directly advancing vm state
  const goToStep2 = async (w: VueWrapper) => {
    const vm = w.vm as unknown as AddTeamFormVm
    vm.teamData.name = 'Test Team'
    vm.teamData.description = 'A test team'
    await w.vm.$nextTick()
    vm.nextStep()
    await w.vm.$nextTick()
  }

  // Navigate to step 3 — mock pre-sets createdTeamData, so we skip straight via nextStep()
  const goToStep3 = async (w: VueWrapper) => {
    vi.mocked(useCreateTeamMutation).mockReturnValue(
      createMockMutationResponse(mockTeamData) as ReturnType<typeof useCreateTeamMutation>
    )
    w.unmount()
    const newWrapper = mountComponent()
    const vm = newWrapper.vm as unknown as AddTeamFormVm
    vm.teamData.name = 'Test Team'
    await newWrapper.vm.$nextTick()
    vm.nextStep() // step 0 → 1
    await newWrapper.vm.$nextTick()
    vm.nextStep() // step 1 → 2 (no members, canProceed = true)
    await newWrapper.vm.$nextTick()
    return newWrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Step Navigation', () => {
    it('should preserve form data when navigating back', async () => {
      wrapper = mountComponent()
      const vm = wrapper.vm as unknown as AddTeamFormVm

      vm.teamData.name = 'Preserved Name'
      vm.teamData.description = 'Preserved Desc'
      vm.currentStep = 1
      await wrapper.vm.$nextTick()
      vm.currentStep = 0
      await wrapper.vm.$nextTick()

      expect(vm.teamData.name).toBe('Preserved Name')
      expect(vm.teamData.description).toBe('Preserved Desc')
    })

    it('should render member input on step 2', async () => {
      wrapper = mountComponent()
      await goToStep2(wrapper)

      const multiSelect = wrapper.find('[data-test="multi-select-stub"]')
      expect(multiSelect.exists()).toBe(true)
    })

    it('should update members via MultiSelectMemberInput', async () => {
      wrapper = mountComponent()
      await goToStep2(wrapper)

      const vm = wrapper.vm as unknown as AddTeamFormVm
      vm.teamData.members = [
        { address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62', name: 'Alice' }
      ]
      await wrapper.vm.$nextTick()

      expect(vm.teamData.members.length).toBe(1)
    })

    it('shows the member count in the step label when step index and members match the computed branch', async () => {
      wrapper = mountComponent()
      const vm = wrapper.vm as unknown as AddTeamFormVm

      vm.currentStep = 3
      vm.teamData.members = [
        { address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62', name: 'Alice' },
        { address: '0x8473AA8b4d95E27F364157DBA0768D7BaeD6931a', name: 'Bob' }
      ]
      await wrapper.vm.$nextTick()

      expect(vm.stepperItems[1]?.title).toBe('Members (2)')
    })
  })

  describe('Team Creation', () => {
    it('should create the team successfully and advance to the next step', async () => {
      const mutation = createMockMutationResponse(mockTeamData)
      vi.mocked(useCreateTeamMutation).mockReturnValue(
        mutation as ReturnType<typeof useCreateTeamMutation>
      )

      wrapper = mountComponent()
      await goToStep2(wrapper)
      await (wrapper.vm as unknown as AddTeamFormVm).saveTeamToDatabase()
      await flushPromises()

      expect(mutation.mutateAsync).toHaveBeenCalled()
      expect((wrapper.vm as unknown as AddTeamFormVm).currentStep).toBe(2)
    })

    it('should show error message when creation fails', async () => {
      vi.mocked(useCreateTeamMutation).mockReturnValue(
        createMockMutationResponse(null, false, new Error('Failed')) as ReturnType<
          typeof useCreateTeamMutation
        >
      )

      wrapper = mountComponent()
      await goToStep2(wrapper)
      await (wrapper.vm as unknown as AddTeamFormVm).saveTeamToDatabase()
      await flushPromises()

      expect(wrapper.find(SELECTORS.createTeamError).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.createTeamError).text()).toContain('Failed to create company')
    })

    it('should not submit when company name is empty', async () => {
      const mutation = createMockMutationResponse(mockTeamData)
      vi.mocked(useCreateTeamMutation).mockReturnValue(
        mutation as ReturnType<typeof useCreateTeamMutation>
      )

      wrapper = mountComponent()
      await goToStep2(wrapper)

      const vm = wrapper.vm as unknown as AddTeamFormVm
      vm.teamData.name = ''
      await wrapper.vm.$nextTick()

      await vm.saveTeamToDatabase()

      expect(mutation.mutateAsync).not.toHaveBeenCalled()
    })

    it('goes back to step 1 when the previous button is clicked', async () => {
      wrapper = mountComponent()
      await goToStep2(wrapper)

      await wrapper.find('[data-test="previous-button"]').trigger('click')

      expect((wrapper.vm as unknown as AddTeamFormVm).currentStep).toBe(0)
    })
  })

  describe('Step 3 - Investor Contract', () => {
    it('should emit done when skip is clicked', async () => {
      wrapper = mountComponent()
      wrapper = await goToStep3(wrapper)

      await wrapper.find(SELECTORS.skipButton).trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('done')).toBeTruthy()
    })

    it('should navigate to team page when contracts are deployed', async () => {
      wrapper = mountComponent()
      wrapper = await goToStep3(wrapper)

      await wrapper.find(SELECTORS.deployContractButton).trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockRouterPush).toHaveBeenCalledWith(`/teams/${mockTeamData.id}`)
    })
  })

  describe('Validation Edge Cases', () => {
    it('should return false for invalid step numbers', async () => {
      wrapper = mountComponent()

      const vm = wrapper.vm as unknown as AddTeamFormVm
      vm.currentStep = 99
      await wrapper.vm.$nextTick()

      expect(vm.canProceed).toBe(false)
    })

    it('should block navigation from step 1 when name is empty', async () => {
      wrapper = mountComponent()

      const vm = wrapper.vm as unknown as AddTeamFormVm
      expect(vm.canProceed).toBe(false)

      vm.nextStep()
      expect(vm.currentStep).toBe(0)
    })

    it('should reject invalid member addresses', async () => {
      wrapper = mountComponent()
      await goToStep2(wrapper)

      const vm = wrapper.vm as unknown as AddTeamFormVm
      vm.teamData.members = [{ address: 'not-an-address', name: 'Invalid' }]
      await wrapper.vm.$nextTick()

      expect(vm.canProceed).toBe(false)
    })
  })
})
