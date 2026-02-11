import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import type { User } from '@/types'
import { createTestingPinia } from '@pinia/testing'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'
import { useCreateTeamMutation } from '@/queries/team.queries'
import { createMockMutationResponse, mockTeamData } from '@/tests/mocks/query.mock'
import { defineComponent, h } from 'vue'

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

  describe('Step Navigation', () => {
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

  describe('Team Creation', () => {
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
  })
})
