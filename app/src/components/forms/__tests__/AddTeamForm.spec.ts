import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import type { User } from '@/types'
import { createTestingPinia } from '@pinia/testing'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'
import { useCreateTeamMutation } from '@/queries/team.queries'
import { createMockMutationResponse, mockTeamData } from '@/tests/mocks/query.mock'
import { defineComponent, h } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'

// Stub for DeployContractSection to avoid wagmi plugin issues
const DeployContractSectionStub = defineComponent({
  name: 'DeployContractSection',
  props: ['disabled', 'investorContractInput', 'createdTeamData'],
  emits: ['contractDeployed'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-test': 'deploy-contract-button',
          disabled: props.disabled,
          onClick: () => emit('contractDeployed')
        },
        slots.default ? slots.default() : 'Deploy Contracts'
      )
  }
})

// Test selectors
const SELECTORS = {
  step1: '[data-test="step-1"]',
  step2: '[data-test="step-2"]',
  step3: '[data-test="step-3"]',
  teamNameInput: '[data-test="team-name-input"]',
  teamDescriptionInput: '[data-test="team-description-input"]',
  shareNameInput: '[data-test="share-name-input"]',
  shareSymbolInput: '[data-test="share-symbol-input"]',
  nextButton: '[data-test="next-button"]',
  previousButton: '[data-test="previous-button"]',
  createTeamButton: '[data-test="create-team-button"]',
  deployContractButton: '[data-test="deploy-contract-button"]',
  createTeamError: '[data-test="create-team-error"]'
} as const

// Test data
const mockUsers: User[] = [
  { name: 'Alice', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' },
  { name: 'Bob', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' }
]

describe('AddTeamForm.vue', () => {
  let wrapper: ReturnType<typeof mount>

  const mountComponent = (props = {}) => {
    return mount(AddTeamForm, {
      props: {
        users: mockUsers,
        isLoading: false,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          DeployContractSection: DeployContractSectionStub
        }
      }
    })
  }

  // Helper to navigate to step 2
  const goToStep2 = async (w: VueWrapper) => {
    await w.find(SELECTORS.teamNameInput).setValue('Test Team')
    await w.find(SELECTORS.teamDescriptionInput).setValue('A test team')
    await w.vm.$nextTick()
    await w.find(SELECTORS.nextButton).trigger('click')
    await w.vm.$nextTick()
  }

  // Helper to navigate to step 3
  const goToStep3 = async (w: VueWrapper) => {
    vi.mocked(useCreateTeamMutation).mockReturnValue(
      createMockMutationResponse(mockTeamData) as ReturnType<typeof useCreateTeamMutation>
    )

    // Remount to pick up the new mock
    w.unmount()
    const newWrapper = mountComponent()
    await goToStep2(newWrapper)
    await newWrapper.find(SELECTORS.createTeamButton).trigger('click')
    await flushPromises()
    return newWrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Rendering', () => {
    it('should render step 1 with team details form', () => {
      wrapper = mountComponent()

      expect(wrapper.find(SELECTORS.step1).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.teamNameInput).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.teamDescriptionInput).exists()).toBe(true)
      expect(wrapper.text()).toContain('Team Details')
    })

    it('should render three step indicators', () => {
      wrapper = mountComponent()

      const steps = wrapper.findAll('.step')
      expect(steps).toHaveLength(3)
      expect(steps[0].text()).toContain('Team Details')
      expect(steps[1].text()).toContain('Members')
      expect(steps[2].text()).toContain('Investor Contract')
    })

    it('should highlight only first step initially', () => {
      wrapper = mountComponent()

      const steps = wrapper.findAll('.step')
      expect(steps[0].classes()).toContain('step-primary')
      expect(steps[1].classes()).not.toContain('step-primary')
      expect(steps[2].classes()).not.toContain('step-primary')
    })
  })

  describe('Step 1 - Team Details', () => {
    it('should disable next button when team name is empty', () => {
      wrapper = mountComponent()

      const nextBtn = wrapper.find(SELECTORS.nextButton).findComponent(ButtonUI)
      expect(nextBtn.props('disabled')).toBe(true)
    })

    it('should enable next button when team name is filled', async () => {
      wrapper = mountComponent()

      await wrapper.find(SELECTORS.teamNameInput).setValue('My Team')
      await wrapper.vm.$nextTick()

      const nextBtn = wrapper.find(SELECTORS.nextButton).findComponent(ButtonUI)
      expect(nextBtn.props('disabled')).toBe(false)
    })

    it('should allow empty description', async () => {
      wrapper = mountComponent()

      await wrapper.find(SELECTORS.teamNameInput).setValue('My Team')
      await wrapper.vm.$nextTick()

      const nextBtn = wrapper.find(SELECTORS.nextButton).findComponent(ButtonUI)
      expect(nextBtn.props('disabled')).toBe(false)
    })
  })

  describe('Step Navigation', () => {
    it('should navigate to step 2 when next is clicked', async () => {
      wrapper = mountComponent()

      await goToStep2(wrapper)

      expect(wrapper.find(SELECTORS.step1).exists()).toBe(false)
      expect(wrapper.find(SELECTORS.step2).exists()).toBe(true)
      expect(wrapper.text()).toContain('Team Members')
    })

    it('should highlight first two steps on step 2', async () => {
      wrapper = mountComponent()

      await goToStep2(wrapper)

      const steps = wrapper.findAll('.step')
      expect(steps[0].classes()).toContain('step-primary')
      expect(steps[1].classes()).toContain('step-primary')
      expect(steps[2].classes()).not.toContain('step-primary')
    })

    it('should go back to step 1 when previous is clicked', async () => {
      wrapper = mountComponent()

      await goToStep2(wrapper)
      await wrapper.find(SELECTORS.previousButton).trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find(SELECTORS.step1).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.step2).exists()).toBe(false)
    })

    it('should preserve form data when navigating back', async () => {
      wrapper = mountComponent()

      await wrapper.find(SELECTORS.teamNameInput).setValue('Preserved Name')
      await wrapper.find(SELECTORS.teamDescriptionInput).setValue('Preserved Desc')
      await wrapper.vm.$nextTick()
      await wrapper.find(SELECTORS.nextButton).trigger('click')
      await wrapper.vm.$nextTick()

      await wrapper.find(SELECTORS.previousButton).trigger('click')
      await wrapper.vm.$nextTick()

      const nameInput = wrapper.find(SELECTORS.teamNameInput).element as HTMLInputElement
      const descInput = wrapper.find(SELECTORS.teamDescriptionInput).element as HTMLInputElement
      expect(nameInput.value).toBe('Preserved Name')
      expect(descInput.value).toBe('Preserved Desc')
    })
  })

  describe('Step 2 - Members', () => {
    beforeEach(async () => {
      wrapper = mountComponent()
      await goToStep2(wrapper)
    })

    it('should show members section content', () => {
      expect(wrapper.find(SELECTORS.step2).exists()).toBe(true)
      expect(wrapper.text()).toContain('Team Members')
      expect(wrapper.text()).toContain('Optional')
    })

    it('should show create team button', () => {
      expect(wrapper.find(SELECTORS.createTeamButton).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.createTeamButton).text()).toBe('Create Team')
    })

    it('should allow proceeding with no members', () => {
      const createBtn = wrapper.find(SELECTORS.createTeamButton).findComponent(ButtonUI)
      expect(createBtn.props('disabled')).toBe(false)
    })
  })

  describe('Team Creation', () => {
    it('should call mutation when create team is clicked', async () => {
      const mockResponse = createMockMutationResponse(mockTeamData)
      vi.mocked(useCreateTeamMutation).mockReturnValue(
        mockResponse as ReturnType<typeof useCreateTeamMutation>
      )

      wrapper = mountComponent()
      await goToStep2(wrapper)
      await wrapper.find(SELECTORS.createTeamButton).trigger('click')
      await flushPromises()

      expect(mockResponse.mutateAsync).toHaveBeenCalledWith({
        name: 'Test Team',
        description: 'A test team',
        members: []
      })
    })

    it('should show loading state during creation', async () => {
      vi.mocked(useCreateTeamMutation).mockReturnValue(
        createMockMutationResponse(null, true) as ReturnType<typeof useCreateTeamMutation>
      )

      wrapper = mountComponent()
      await goToStep2(wrapper)

      const createBtn = wrapper.find(SELECTORS.createTeamButton).findComponent(ButtonUI)
      expect(createBtn.props('loading')).toBe(true)
    })

    it('should navigate to step 3 after successful creation', async () => {
      wrapper = mountComponent()
      wrapper = await goToStep3(wrapper)

      expect(wrapper.find(SELECTORS.step3).exists()).toBe(true)
      expect(wrapper.text()).toContain('Investor Contract Details')
    })

    it('should show error message when creation fails', async () => {
      vi.mocked(useCreateTeamMutation).mockReturnValue(
        createMockMutationResponse(null, false, new Error('Failed')) as ReturnType<
          typeof useCreateTeamMutation
        >
      )

      wrapper = mountComponent()
      await goToStep2(wrapper)
      await wrapper.find(SELECTORS.createTeamButton).trigger('click')
      await flushPromises()

      expect(wrapper.find(SELECTORS.createTeamError).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.createTeamError).text()).toContain('Unable to create team')
    })
  })

  describe('Step 3 - Investor Contract', () => {
    it('should show share name and symbol inputs', async () => {
      wrapper = mountComponent()
      wrapper = await goToStep3(wrapper)

      expect(wrapper.find(SELECTORS.shareNameInput).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.shareSymbolInput).exists()).toBe(true)
    })

    it('should highlight all steps on step 3', async () => {
      wrapper = mountComponent()
      wrapper = await goToStep3(wrapper)

      const steps = wrapper.findAll('.step')
      expect(steps[0].classes()).toContain('step-primary')
      expect(steps[1].classes()).toContain('step-primary')
      expect(steps[2].classes()).toContain('step-primary')
    })

    it('should show deploy contract button when team data exists', async () => {
      wrapper = mountComponent()
      wrapper = await goToStep3(wrapper)

      expect(wrapper.find(SELECTORS.deployContractButton).exists()).toBe(true)
    })

    it('should disable deploy button when share fields are empty', async () => {
      wrapper = mountComponent()
      wrapper = await goToStep3(wrapper)

      const deployBtn = wrapper.find(SELECTORS.deployContractButton)
      expect(deployBtn.attributes('disabled')).toBeDefined()
    })

    it('should enable deploy button when share fields are filled', async () => {
      wrapper = mountComponent()
      wrapper = await goToStep3(wrapper)

      await wrapper.find(SELECTORS.shareNameInput).setValue('Company Shares')
      await wrapper.find(SELECTORS.shareSymbolInput).setValue('SHR')
      await wrapper.vm.$nextTick()

      const deployBtn = wrapper.find(SELECTORS.deployContractButton)
      expect(deployBtn.attributes('disabled')).toBeUndefined()
    })

    it('should emit done event when contract is deployed', async () => {
      wrapper = mountComponent()
      wrapper = await goToStep3(wrapper)

      await wrapper.find(SELECTORS.shareNameInput).setValue('Company Shares')
      await wrapper.find(SELECTORS.shareSymbolInput).setValue('SHR')
      await wrapper.vm.$nextTick()

      await wrapper.find(SELECTORS.deployContractButton).trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('done')).toBeTruthy()
    })
  })

  describe('Validation Edge Cases', () => {
    it('should return false for invalid step numbers', async () => {
      wrapper = mountComponent()

      const vm = wrapper.vm as unknown as { currentStep: number; canProceed: boolean }
      vm.currentStep = 99
      await wrapper.vm.$nextTick()

      expect(vm.canProceed).toBe(false)
    })

    it('should reject invalid member addresses', async () => {
      wrapper = mountComponent()
      await goToStep2(wrapper)

      const vm = wrapper.vm as unknown as {
        teamData: { members: Array<{ address: string; name: string }> }
        canProceed: boolean
      }

      vm.teamData.members = [{ address: 'not-an-address', name: 'Invalid' }]
      await wrapper.vm.$nextTick()

      expect(vm.canProceed).toBe(false)
    })

    // it('should accept valid ethereum addresses', async () => {
    //   wrapper = mountComponent()
    //   await goToStep2(wrapper)

    //   const vm = wrapper.vm as unknown as {
    //     teamData: { members: Array<{ address: string; name: string }> }
    //     canProceed: boolean
    //   }

    //   vm.teamData.members = [
    //     { address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62', name: 'Valid' }
    //   ]
    //   await wrapper.vm.$nextTick()

    //   expect(vm.canProceed).toBe(true)
    // })
  })
})
