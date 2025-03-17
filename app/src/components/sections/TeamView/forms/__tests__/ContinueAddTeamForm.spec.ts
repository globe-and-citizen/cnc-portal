import { describe, it, vi, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ContinueAddTeamForm from '@/components/sections/TeamView/forms/ContinueAddTeamForm.vue'
import type { Team } from '@/types/team'
import { createTestingPinia } from '@pinia/testing'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'

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

const team = ref<Partial<Team>>({
  id: '1',
  name: 'Team 1',
  description: 'Team 1 description',
  ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62',
  officerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
})
describe('ContinueAddTeamForm', () => {
  const wrapper = mount(ContinueAddTeamForm, {
    props: {
      team: team.value
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

  it('should render the component', async () => {
    expect(wrapper.exists()).toBe(true)

    // Expect the error message to not be displayed by default
    expect(wrapper.find("[data-test='share-name-error']").exists()).toBeFalsy()
    expect(wrapper.find("[data-test='share-symbol-error']").exists()).toBeFalsy()

    const symbolInput = wrapper.find("[data-test='share-symbol-input']")
    symbolInput.setValue('WG')
    symbolInput.trigger('keyup')
    await wrapper.vm.$nextTick()

    // Expect the error message to be displayed
    expect(wrapper.find("[data-test='share-symbol-error']").exists()).toBeTruthy()

    symbolInput.setValue('WGG')
    symbolInput.trigger('keyup')
    await wrapper.vm.$nextTick()

    // Expect the error message to not be displayed
    expect(wrapper.find("[data-test='share-symbol-error']").exists()).toBeFalsy()

    const nameInput = wrapper.find("[data-test='share-name-input']")
    nameInput.setValue('WA')
    nameInput.trigger('keyup')
    await wrapper.vm.$nextTick()

    // Expect the error message to be displayed
    expect(wrapper.find("[data-test='share-name-error']").exists()).toBeTruthy()

    nameInput.setValue('WAGMI')
    nameInput.trigger('keyup')
    await wrapper.vm.$nextTick()

    // Expect the error message to not be displayed
    expect(wrapper.find("[data-test='share-name-error']").exists()).toBeFalsy()

    const deployCompoent = wrapper.findComponent(DeployContractSection)
    expect(wrapper.emitted('done')).toBeFalsy()

    deployCompoent.vm.$emit('contractDeployed')
    // Check if wrapper emmit done event
    expect(wrapper.emitted('done')).toBeTruthy()
  })
})
