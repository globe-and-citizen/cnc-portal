import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddMemberForm from '@/components/forms/AddMemberForm.vue'

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
      isLoading: false,
    }
  })
  // Test the rendering of the component
  describe('Render', () => {
    it('renders correctly with initial props', () => {
      expect(wrapper.find('h1').text()).toBe('Add New Member')
      expect(wrapper.findAll('.input-group').length).toBe(formData.length)
    })
    it('shows dropdown when users are available', async () => {
      expect(wrapper.find('.dropdown-open').exists()).toBe(true)
    })

    it('updates formData when a user is selected from dropdown', async () => {
      await wrapper.find('.dropdown a').trigger('click')
      expect((wrapper.vm as any).formData[0].name).toBe(users[0].name)
      expect((wrapper.vm as any).formData[0].address).toBe(users[0].address)
    })
  })

  // Test the emitting of events
  describe('Emits', () => {
    it('emits addMembers when add button is clicked', async () => {
      await wrapper.find('button.btn-primary').trigger('click')
      expect(wrapper.emitted('addMembers')).toBeTruthy()
    })

    it('Should trigger searchUsers on keyup.stop', async () => {
      const wrapper = mount(AddMemberForm, {
        props: {
          formData: [{ name: '', address: '', isValid: false }],
          users,
          isLoading: false
        }
      })
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBe(2)

      // Intial state of the searchUser event
      expect(wrapper.emitted('searchUsers')).toBe(undefined)

      // Set the value of the first input and trigger
      await inputs[0].setValue('Farrel')

      // No emit after setting the value until we trigger
      expect(wrapper.emitted('searchUsers')).toBe(undefined)

      expect(inputs[0].element.value).toBe('Farrel')
      await inputs[0].trigger('keyup.stop')

      // Result after trigger
      expect(wrapper.emitted('searchUsers')).toMatchSnapshot(`
        [
          [
            {
              "address": "",
              "isValid": false,
              "name": "Farrel",
            },
          ],
        ]
      `)

      // Type in the second input and trigger
      await inputs[1].setValue('0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E')
      await inputs[1].trigger('keyup.stop')

      // Result After trigger
      expect(wrapper.emitted('searchUsers')).toMatchSnapshot(`
        [
          [
            {
              "address": "0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E",
              "isValid": true,
              "name": "Farrel",
            },
          ],
          [
            {
              "address": "0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E",
              "isValid": true,
              "name": "Farrel",
            },
          ],
        ]
      `)
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
})
