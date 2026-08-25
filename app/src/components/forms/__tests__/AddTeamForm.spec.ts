import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'
import { useCreateTeamMutation } from '@/queries/team.queries'
import { createMockMutationResponse, mockTeamData } from '@/tests/mocks/query.mock'
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
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { 'data-test': 'multi-select-stub' })
  }
})

// Test selectors
const SELECTORS = {
  teamNameInput: '[data-test="team-name-input"]',
  teamDescriptionInput: '[data-test="team-description-input"]',
  createTeamError: '[data-test="create-team-error"]',
  step1: '[data-test="step-1"]',
  step2: '[data-test="step-2"]',
  step3: '[data-test="step-3"]'
} as const

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

  // Drive step 0 inputs via real UI, then submit form → advances to step 1
  const fillStep1 = async (w: VueWrapper, name = 'Test Team', description = 'A test team') => {
    await w.find(SELECTORS.teamNameInput).setValue(name)
    await w.find(SELECTORS.teamDescriptionInput).setValue(description)
    await w.vm.$nextTick()
  }

  const goToStep2 = async (w: VueWrapper) => {
    await fillStep1(w)
    await w.find('form[data-test="step-1"]').trigger('submit.prevent')
    await flushPromises()
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

      await fillStep1(wrapper, 'Preserved Name', 'Preserved Desc')
      await wrapper.find('form[data-test="step-1"]').trigger('submit.prevent')
      await flushPromises()
      expect(wrapper.find(SELECTORS.step2).exists()).toBe(true)

      await wrapper.find('[data-test="previous-button"]').trigger('click')
      await flushPromises()

      // Inputs retain their values when returning to step 1
      expect((wrapper.find(SELECTORS.teamNameInput).element as HTMLInputElement).value).toBe(
        'Preserved Name'
      )
      expect(
        (wrapper.find(SELECTORS.teamDescriptionInput).element as HTMLTextAreaElement).value
      ).toBe('Preserved Desc')
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

      const multiSelect = wrapper.findComponent({ name: 'MultiSelectMemberInput' })
      await multiSelect.vm.$emit('update:modelValue', [
        { address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62', name: 'Alice' }
      ])
      await wrapper.vm.$nextTick()

      expect(multiSelect.props('modelValue')).toEqual([
        { address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62', name: 'Alice' }
      ])
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
      await wrapper.find('[data-test="create-team-button"]').trigger('click')
      await flushPromises()

      expect(mutation.mutateAsync).toHaveBeenCalled()
      // Successful creation advances to step 3 (Investor Contract)
      expect(wrapper.find(SELECTORS.step3).exists()).toBe(true)
    })

    it('should show error message when creation fails', async () => {
      vi.mocked(useCreateTeamMutation).mockReturnValue(
        createMockMutationResponse(null, false, new Error('Failed')) as ReturnType<
          typeof useCreateTeamMutation
        >
      )

      wrapper = mountComponent()
      await goToStep2(wrapper)
      await wrapper.find('[data-test="create-team-button"]').trigger('click')
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

      // Clear the name via input control directly — re-renders step 2 but with
      // empty bound name. Step 2 has no name input, so we go back, clear it,
      // then attempt to advance again.
      await wrapper.find('[data-test="previous-button"]').trigger('click')
      await flushPromises()
      await wrapper.find(SELECTORS.teamNameInput).setValue('')

      // From step 1, submit attempts shouldn't advance: schema fails on empty name
      await wrapper.find('form[data-test="step-1"]').trigger('submit.prevent')
      await flushPromises()

      // create-team button is gated by canProceed (empty name) so it never gets to step 2
      expect(wrapper.find('[data-test="create-team-button"]').exists()).toBe(false)
      expect(mutation.mutateAsync).not.toHaveBeenCalled()
    })

    it('goes back to step 1 when the previous button is clicked', async () => {
      wrapper = mountComponent()
      await goToStep2(wrapper)

      await wrapper.find('[data-test="previous-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.find(SELECTORS.step1).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.step2).exists()).toBe(false)
    })
  })

  describe('Validation Edge Cases', () => {
    it('should block navigation from step 1 when name is empty', async () => {
      wrapper = mountComponent()

      // Submitting the empty form does not advance — step 1 stays visible
      await wrapper.find('form[data-test="step-1"]').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.find(SELECTORS.step1).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.step2).exists()).toBe(false)
    })

    it('should reject invalid member addresses', async () => {
      wrapper = mountComponent()
      await goToStep2(wrapper)

      const multiSelect = wrapper.findComponent({ name: 'MultiSelectMemberInput' })
      await multiSelect.vm.$emit('update:modelValue', [
        { address: 'not-an-address', name: 'Invalid' }
      ])
      await wrapper.vm.$nextTick()

      // Create button disabled because canProceed === false
      const createBtn = wrapper.find('[data-test="create-team-button"]')
      expect(createBtn.attributes('disabled')).toBeDefined()
    })
  })
})
