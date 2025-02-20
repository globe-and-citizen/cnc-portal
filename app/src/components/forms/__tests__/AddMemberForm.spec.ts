import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import AddMemberForm from '@/components/sections/SingleTeamView/forms/AddMemberForm.vue'
// import { nextTick } from 'vue'

interface AddMemberForm {
  showDropdown: boolean
  formData: Array<{ name: string; address: string; isValid: boolean }>
  submitForm: () => void
}

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  })
}))
describe('AddMemberForm.vue', () => {
  let wrapper: VueWrapper<unknown>
  beforeEach(() => {
    wrapper = mount(AddMemberForm, {
      // props: {
      //   formData: [{ name: '', address: '', isValid: false }],
      //   users: [],
      //   isLoading: false
      // }
    })
  })

  describe('Initial state', () => {
    it("Should display 'Add Member' button", () => {
      expect(wrapper.find('button').text()).toBe('Add Members')
    })
  })

  // describe('Dropdown functionality', () => {
  //   it('shows dropdown when searching for users', async () => {
  //     const input = wrapper.find('input[placeholder="Member Name 1"]')
  //     await input.setValue('John')
  //     await input.trigger('keyup')

  //     expect(wrapper.emitted('searchUsers')).toBeTruthy()
  //     expect((wrapper.vm as unknown as AddMemberForm).showDropdown).toBe(true)
  //   })

  //   it('selects user from dropdown', async () => {
  //     await wrapper.setProps({
  //       users: [{ name: 'John Doe', address: '0x1234567890123456789012345678901234567890' }]
  //     })
  //     ;(wrapper.vm as unknown as AddMemberForm).showDropdown = true
  //     await nextTick()

  //     const dropdownItem = wrapper.find('.dropdown-content a')
  //     await dropdownItem.trigger('click')

  //     expect((wrapper.vm as unknown as AddMemberForm).formData[0].name).toBe('John Doe')
  //     expect((wrapper.vm as unknown as AddMemberForm).formData[0].address).toBe(
  //       '0x1234567890123456789012345678901234567890'
  //     )
  //     expect((wrapper.vm as unknown as AddMemberForm).showDropdown).toBe(false)
  //   })
  // })

  // describe('Form validation', () => {
  //   it('shows validation error for no input', async () => {
  //     await (wrapper.vm as unknown as AddMemberForm).submitForm()

  //     expect(wrapper.find('.text-red-500').text()).toContain('Invalid wallet address')
  //   })

  //   it('shows validation error when no members are added', async () => {
  //     await (wrapper.vm as unknown as AddMemberForm).submitForm()

  //     expect(wrapper.find('.text-red-500').text()).toContain(
  //       'Address is requiredInvalid wallet address'
  //     )
  //   })
  // })
  // describe('Snapshot', () => {
  //   it('matches the snapshot', () => {
  //     expect(wrapper.html()).toMatchSnapshot()
  //   })
  // })

  // describe('Submit form', () => {
  //   it('does not emit addMembers event when form is invalid', async () => {
  //     await (wrapper.vm as unknown as AddMemberForm).submitForm()

  //     expect(wrapper.emitted('addMembers')).toBeFalsy()
  //   })

  //   it('emits addMembers event when form is valid', async () => {
  //     const nameInput = wrapper.find('input[placeholder="Member Name 1"]')
  //     const addressInput = wrapper.find('input[placeholder="Wallet Address 1"]')

  //     await nameInput.setValue('John Doe')
  //     await addressInput.setValue('0x1234567890123456789012345678901234567890')
  //     await (wrapper.vm as unknown as AddMemberForm).submitForm()

  //     expect(wrapper.emitted('addMembers')).toBeTruthy()
  //   })
  // })
})
