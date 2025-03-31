import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
// import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'
import UserComponent from '@/components/UserComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import type { TeamInput, User } from '@/types'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'

// Define interface for component instance
interface ComponentInstance {
  currentStep: number
  canProceed: boolean
  teamData: TeamInput
  investorContractInput: {
    name: string
    symbol: string
  }
}

// Mock the useWriteContract and useWaitForTransactionReceipt composable
const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useWatchContractEvent: vi.fn()
  }
})
describe('AddTeamForm.vue', () => {
  const users: User[] = [
    { name: 'Ravioli', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' },
    { name: 'Dasarath', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' }
  ]

  const mountComponent = () => {
    const div = document.createElement('div')
    document.body.appendChild(div)

    const wrapper = mount(AddTeamForm, {
      props: {
        users,
        isLoading: false
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    return wrapper
  }

  let wrapper = mountComponent()

  // Reset component before each test
  beforeEach(() => {
    wrapper = mountComponent()
  })

  // Helper function to navigate to members step
  const navigateToMembersStep = async (w: VueWrapper) => {
    // Fill team details
    await w.find('[data-test="team-name-input"]').setValue('Test Team')
    await w.find('[data-test="team-description-input"]').setValue('Test Description')
    await w.vm.$nextTick()

    // Trigger validation and wait for step change
    await w.find('[data-test="next-button"]').trigger('click')

    // vi.mock('@/composables/useCustomFetch', () => {
    //   return {
    //     useCustomFetch: vi.fn(() => ({
    //       json: () => ({
    //         execute: vi.fn(),
    //         data: [],
    //         loading: ref(false),
    //         error: ref<unknown>(null)
    //       }),
    //       get: () => ({
    //         json: () => ({
    //           execute: vi.fn(),
    //           data: {
    //             users: [
    //               { address: '0x123', name: 'John Doe' },
    //               { address: '0x456', name: 'Jane Doe' }
    //             ]
    //           },
    //           loading: ref(false),
    //           error: ref<unknown>(null)
    //         })
    //       }),
    //       post: () => ({
    //         json: () => ({
    //           execute: vi.fn(),
    //           data: {
    //             id: 1,
    //             name: 'Team Name',
    //             description: 'Team Description'
    //           },
    //           loading: ref(false),
    //           error: ref<unknown>(null)
    //         })
    //       })
    //     }))
    //   }
    // })

    await w.vm.$nextTick()
  }

  // Helper function to navigate to investor contract step
  // const navigateToInvestorStep = async (w: VueWrapper) => {
  //   await navigateToMembersStep(w)
  //   await w.find('[data-test="create-team-button"]').trigger('click')
  //   await w.vm.$nextTick()
  // }

  describe('Initial Render', () => {
    it('renders step 1 by default', () => {
      expect(wrapper.text()).toContain('Team Details')
      expect(wrapper.findAll('.step').length).toBe(3)
      expect(wrapper.findAll('.step-primary').length).toBe(1)
    })
  })

  describe('Step Navigation', () => {
    it('disables next button when step 1 validation fails', async () => {
      const nextButton = wrapper.find('[data-test="next-button"]').findComponent(ButtonUI)
      expect(nextButton.text()).toBe('Next')
      expect(nextButton.props().disabled).toBe(true)

      // Trigger validation by clicking next without filling required fields
      await nextButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Wait for validation to update
      await wrapper.vm.$nextTick()

      expect(nextButton.props().disabled).toBe(true)
    })

    // Moving from step 1 to step 2 and back to step 1
    it('allows going back from step2 to step 1', async () => {
      // Check Step 1 states
      expect(wrapper.find('[data-test="step-1"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="step-2"]').exists()).toBeFalsy()
      expect(wrapper.findAll('.step-primary').length).toBe(1)

      // Navigate TO step 2
      await navigateToMembersStep(wrapper)

      // Check Step 2 States
      expect(wrapper.find('[data-test="step-1"]').exists()).toBeFalsy()
      expect(wrapper.find('[data-test="step-2"]').exists()).toBeTruthy()
      expect(wrapper.findAll('.step-primary').length).toBe(2)

      // Navigate back to step 1
      const prevButton = wrapper.find('[data-test="previous-button"]').findComponent(ButtonUI)
      await prevButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Check Step 1 states
      expect(wrapper.find('[data-test="step-1"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="step-2"]').exists()).toBeFalsy()
      expect(wrapper.findAll('.step-primary').length).toBe(1)
    })
  })

  describe('Step Navigation Edge Cases', () => {
    it('prevents proceeding on invalid step number', async () => {
      // Access the component instance
      const vm = wrapper.vm as unknown as ComponentInstance

      // Set an invalid step number
      vm.currentStep = 4
      await wrapper.vm.$nextTick()

      // Check that canProceed is false
      expect(vm.canProceed).toBe(false)
    })

    it('prevents proceeding on negative step number', async () => {
      const vm = wrapper.vm as unknown as ComponentInstance
      vm.currentStep = -1
      await wrapper.vm.$nextTick()

      expect(vm.canProceed).toBe(false)
    })

    it('prevents proceeding when step is not a number', async () => {
      const vm = wrapper.vm as unknown as ComponentInstance
      ;(vm.currentStep as unknown) = 'invalid'
      await wrapper.vm.$nextTick()

      expect(vm.canProceed).toBe(false)
    })

    it('handles edge cases in member validation', async () => {
      await navigateToMembersStep(wrapper)
      const vm = wrapper.vm as unknown as ComponentInstance
      // Test with null address
      vm.teamData.members[0] = { address: null as unknown as string, name: 'Test' }
      // vm.teamData.members[0].address = null as unknown as string
      await wrapper.vm.$nextTick()
      expect(vm.canProceed).toBe(false) // Should Not allow proceeding with null address

      // Test with undefined address
      vm.teamData.members[0] = { address: undefined as unknown as string, name: 'Test' }
      await wrapper.vm.$nextTick()
      expect(vm.canProceed).toBe(false) // Should Not allow proceeding with undefined address

      // Test with mixed valid and invalid addresses
      vm.teamData.members.push({
        name: 'Test',
        address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
      })
      vm.teamData.members.push({
        name: 'Invalid',
        address: 'invalid-address'
      })
      await wrapper.vm.$nextTick()
      expect(vm.canProceed).toBe(false) // Should not proceed with any invalid address
    })

    // it('handles edge cases in investor contract validation', async () => {
    //   // await navigateToInvestorStep(wrapper)

    //   const vm = wrapper.vm as unknown as ComponentInstance
    //   expect(vm.currentStep).toBe(1)
    //   await navigateToInvestorStep(wrapper)
    //   expect(vm.currentStep).toBe(3)

    //   const DeployContractButton = wrapper.findComponent(DeployContractSection)
    //   expect(DeployContractButton.exists()).toBe(true)

    //   // Test with empty strings
    //   vm.investorContractInput.name = ''
    //   vm.investorContractInput.symbol = ''
    //   await wrapper.vm.$nextTick()
    //   expect(vm.canProceed).toBe(false)

    //   // Test with whitespace only
    //   vm.investorContractInput.name = ''
    //   vm.investorContractInput.symbol = ''
    //   await wrapper.vm.$nextTick()
    //   expect(vm.canProceed).toBe(false)

    //   // Test with one field filled
    //   vm.investorContractInput.name = 'Test'
    //   vm.investorContractInput.symbol = ''
    //   await wrapper.vm.$nextTick()
    //   expect(vm.canProceed).toBe(false)

    //   vm.investorContractInput.name = ''
    //   vm.investorContractInput.symbol = 'TST'
    //   await wrapper.vm.$nextTick()
    //   expect(vm.canProceed).toBe(false)

    //   // Test with special characters
    //   vm.investorContractInput.name = '!@#$%'
    //   vm.investorContractInput.symbol = '!@#'
    //   await wrapper.vm.$nextTick()
    //   expect(vm.canProceed).toBe(true) // Should allow special characters
    // })
  })

  describe('Member Management', () => {
    beforeEach(async () => {
      await navigateToMembersStep(wrapper)
    })

    it('shows empty state when no members are added', () => {
      expect(wrapper.findAllComponents(UserComponent).length).toBe(0)
    })

    // TODO: Search And Add member
    // TODO: Remove member from the list
  })
})
