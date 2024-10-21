import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddMemberForm from '@/components/sections/SingleTeamView/forms/AddMemberForm.vue'

interface ComponentData {
  formData: { name: string; address: string; isValid: boolean }[]
  users: { name: string; address: string }[]
}
describe('AddMemberModal.vue', () => {
  const formData = [
    { name: 'Hermann', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E', isValid: true }
  ]
  const users = [
    { name: 'Dachu', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' },
    { name: 'Farrell', address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62' }
  ]

  const wrapper = mount(AddMemberForm, {
    props: {
      formData,
      users,
      isLoading: false
    }
  })
  // Test the rendering of the component
  describe('Render', () => {
    it('renders correctly with initial props', () => {
      expect(wrapper.find('h1').text()).toBe('Add New Member')
      expect(wrapper.findAll('.input-group').length).toBe(formData.length)
    })
  })
  describe('Snapshot', () => {
    it('matches the snapshot', () => {
      expect(wrapper.html()).toMatchSnapshot()
    })
  })

  // Test the emitting of events
  describe('Emits', () => {
    it('emits addMembers when add button is clicked', async () => {
      await wrapper.find('button.btn-primary').trigger('click')
      expect(wrapper.emitted('addMembers')).toBeTruthy()
    })
  })

  // The the behavior of the component on user actions
  describe('Actions', () => {
    it('adds a new member input field when clicking the add icon', async () => {
      const wrapper = mount(AddMemberForm, {
        props: {
          formData: [{ name: '', address: '', isValid: false }],
          users: [],
          isLoading: false
        }
      })

      const addButton = wrapper.find('[data-test="plus-icon"]')
      await addButton.trigger('click')

      expect(wrapper.findAll('.input-group').length).toBe(2)
    })

    it('removes the last member input field when clicking the remove icon', async () => {
      const wrapper = mount(AddMemberForm, {
        props: {
          formData: [
            { name: '', address: '', isValid: false },
            { name: '', address: '', isValid: false }
          ],
          users: [],
          isLoading: false
        }
      })
      const removeButton = wrapper.find('[data-test="minus-icon"]')
      await removeButton.trigger('click')

      expect(wrapper.findAll('.input-group').length).toBe(1)
    })
  })
  describe('Validation', () => {
    it('displays validation errors when form is invalid', async () => {
      const inputFields = wrapper.findAll('input')
      await inputFields[0].setValue('New Name')
      await inputFields[1].setValue('0xNewAddress')

      expect((wrapper.vm as unknown as ComponentData).formData[0].name).toBe('New Name')
      expect((wrapper.vm as unknown as ComponentData).formData[0].address).toBe('0xNewAddress')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })
  })
})
