import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import CreateElectionForm from '@/components/sections/AdministrationView/forms/CreateElectionForm.vue'
import { nextTick } from 'vue'

// Minimal stubs that mirror v-model behavior where needed
const ButtonUIStub = {
  name: 'ButtonUI',
  props: ['loading', 'disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot/></button>'
}

const MultiSelectMemberInputStub = {
  name: 'MultiSelectMemberInput',
  props: { modelValue: { default: () => [] } },
  emits: ['update:modelValue'],
  template: '<div data-test="multiselect-stub"></div>'
}

const VueDatePickerStub = {
  name: 'VueDatePicker',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input data-test="date-input" />'
}

type Candidate = { name: string; candidateAddress: string }

type CreateElectionVm = {
  newProposalInput: Partial<{
    title: string
    description: string
    startDate: Date
    endDate: Date
    isElection: boolean
    winnerCount: number
    candidates: Candidate[]
  }>
  formData: Array<{ address: string; name: string }>
  $v?: {
    proposal?: {
      candidates?: {
        $invalid: boolean
        $errors: Array<{ $message?: string }>
        $error: boolean
      }
    }
  }
}

type InternalVm = {
  showDropdown: boolean
  formRef: { contains: (node: Node) => boolean } | null
}

const mountForm = (props: Record<string, unknown> = {}) =>
  shallowMount(CreateElectionForm, {
    props: { isLoading: false, ...props },
    global: {
      stubs: {
        ButtonUI: ButtonUIStub,
        MultiSelectMemberInput: MultiSelectMemberInputStub,
        VueDatePicker: VueDatePickerStub
      }
    }
  })

describe('CreateElectionForm', () => {
  beforeEach(() => {
    // noop
  })

  it('renders inputs and submit button', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-test="titleInput"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="descriptionInput"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="winnerCountInput"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="submitButton"]').exists()).toBe(true)
  })

  it('does not emit createProposal when form is invalid', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="submitButton"]').trigger('click')
    await nextTick()
    expect(wrapper.emitted('createProposal')).toBeUndefined()
  })

  it('validates winnerCount (odd and >=3) and shows message', async () => {
    const wrapper = mountForm()

    await wrapper.find('[data-test="titleInput"]').setValue('T')
    await wrapper.find('[data-test="descriptionInput"]').setValue('Too short')
    // set a value for winnerCount via DOM
    await wrapper.find('[data-test="winnerCountInput"]').setValue('4')

    // Touch submit to trigger validation
    await wrapper.find('[data-test="submitButton"]').trigger('click')
    await nextTick()

    // Expect an error about odd number or min value to be present in error blocks
    const errors = wrapper.findAll('.text-red-500')
    const found = errors.some((e) =>
      /odd number|Number of directors must be an odd number|min value/i.test(e.text())
    )
    expect(found).toBe(true)
    expect(wrapper.emitted('createProposal')).toBeUndefined()
  })

  it('validates start and end date relationship', async () => {
    const wrapper = mountForm()
    const vm = wrapper.vm as unknown as CreateElectionVm

    // Fill other required values so date validators run
    await wrapper.find('[data-test="titleInput"]').setValue('Valid title')
    await wrapper.find('[data-test="descriptionInput"]').setValue('A sufficiently long description')
    await wrapper.find('[data-test="winnerCountInput"]').setValue('3')

    // Set endDate before startDate
    vm.newProposalInput.startDate = new Date(Date.now() + 2 * 60 * 60 * 1000)
    vm.newProposalInput.endDate = new Date(Date.now() + 60 * 60 * 1000)

    await wrapper.find('[data-test="submitButton"]').trigger('click')
    await nextTick()

    const errors = wrapper.findAll('.text-red-500')
    const hasDateError = errors.some((e) =>
      /Start date must be before end date|End date must be later than start date/i.test(e.text())
    )
    expect(hasDateError).toBe(true)
    expect(wrapper.emitted('createProposal')).toBeUndefined()
  })

  it('blocks duplicate candidates', async () => {
    const wrapper = mountForm()
    const vm = wrapper.vm as unknown as CreateElectionVm

    await wrapper.find('[data-test="titleInput"]').setValue('Valid title')
    await wrapper.find('[data-test="descriptionInput"]').setValue('A sufficiently long description')
    await wrapper.find('[data-test="winnerCountInput"]').setValue('3')

    vm.newProposalInput.startDate = new Date(Date.now() + 60 * 60 * 1000)
    vm.newProposalInput.endDate = new Date(Date.now() + 2 * 60 * 60 * 1000)

    // Provide duplicate addresses in formData
    vm.formData = [
      { name: 'Alice', address: '0xabc' },
      { name: 'Bob', address: '0xabc' }
    ]

    await wrapper.find('[data-test="submitButton"]').trigger('click')
    await nextTick()

    const vmWithV = wrapper.vm as unknown as CreateElectionVm
    expect(vmWithV.$v?.proposal?.candidates?.$invalid).toBe(true)
    expect(wrapper.emitted('createProposal')).toBeUndefined()
  })

  it('closes dropdown when clicking outside (handleClickOutside)', async () => {
    const wrapper = mountForm()
    const vm = wrapper.vm as unknown as InternalVm

    // simulate dropdown open and a formRef that does NOT contain the click target
    vm.showDropdown = true
    vm.formRef = { contains: () => false }

    // dispatch a document click which the component registered on mount
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(vm.showDropdown).toBe(false)
  })

  it('removes document click listener on unmount', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const wrapper = mountForm()

    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
    removeSpy.mockRestore()
  })
})
