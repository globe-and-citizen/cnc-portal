import { describe, it } from 'vitest'
import { shallowMount, mount, flushPromises } from '@vue/test-utils'
import CreateElectionForm from '@/components/sections/AdministrationView/forms/CreateElectionForm.vue'

const MultiSelectStub = {
  props: { modelValue: { default: () => [] } },
  emits: ['update:modelValue'],
  template: '<div />'
}
const VueDatePickerStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input />'
}

const shallowMountForm = () =>
  shallowMount(CreateElectionForm, {
    props: { isLoading: false },
    global: {
      stubs: {
        MultiSelectMemberInput: MultiSelectStub,
        VueDatePicker: VueDatePickerStub
      }
    }
  })

const fullMountForm = () =>
  mount(CreateElectionForm, {
    props: { isLoading: false },
    global: {
      stubs: {
        MultiSelectMemberInput: MultiSelectStub,
        VueDatePicker: VueDatePickerStub
      }
    }
  })

describe('election debug', () => {
  it('shallowMount - click and errors', async () => {
    const wrapper = shallowMountForm()
    await wrapper.find('[data-test="titleInput"]').setValue('Title long enough')
    await wrapper.find('[data-test="descriptionInput"]').setValue('Desc long enough here')
    await wrapper.find('[data-test="winnerCountInput"]').setValue('4')
    const btn = wrapper.find('[data-test="submitButton"]')
    console.log('Shallow btn:', btn.html()?.substring(0, 150))
    await btn.trigger('click')
    await flushPromises()
    const errors = wrapper.findAll('.text-red-500')
    console.log('Shallow errors count:', errors.length, errors.map((e) => e.text()).slice(0, 3).join('||'))
  })

  it('mount - click and errors', async () => {
    const wrapper = fullMountForm()
    await wrapper.find('[data-test="titleInput"]').setValue('Title long enough')
    await wrapper.find('[data-test="descriptionInput"]').setValue('Desc long enough here')
    await wrapper.find('[data-test="winnerCountInput"]').setValue('4')
    const btn = wrapper.find('[data-test="submitButton"]')
    console.log('Mount btn:', btn.html()?.substring(0, 150))
    await btn.trigger('click')
    await flushPromises()
    const errors = wrapper.findAll('.text-red-500')
    console.log('Mount errors count:', errors.length, errors.map((e) => e.text()).slice(0, 3).join('||'))
  })
})
