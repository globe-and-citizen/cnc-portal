import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import EditUserModal from '@/components/modals/EditUserModal.vue'
import LoadingButton from '@/components/LoadingButton.vue'

describe('EditUserModal.vue', () => {
  let wrapper: ReturnType<typeof mount>
  const updateUserInput = {
    name: 'Dasarath',
    address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62',
    isValid: true
  }

  const createComponent = (propsData: any) => {
    wrapper = mount(EditUserModal, {
      props: {
        ...propsData
      },
      global: {
        components: {
          LoadingButton
        }
      }
    })
  }

  beforeEach(() => {
    createComponent({
      showEditUserModal: true,
      updateUserInput,
      isLoading: false
    })
  })
  describe('Render', () => {
    it('renders correctly with initial props', () => {
      expect(wrapper.find('h1').text()).toBe('User')
      expect((wrapper.find('input[placeholder="John Doe"]').element as any).value).toBe(
        updateUserInput.name
      )
      expect((wrapper.find('input[placeholder="Enter wallet address"]').element as any).value).toBe(
        updateUserInput.address
      )
    })
    it('displays loading button when isLoading is true', async () => {
      createComponent({
        showEditUserModal: true,
        updateUserInput,
        isLoading: true
      })
      expect(wrapper.findComponent(LoadingButton).exists()).toBe(true)
    })

    it('displays save button when isLoading is false', async () => {
      createComponent({
        showEditUserModal: true,
        updateUserInput,
        isLoading: false
      })
      expect(wrapper.find('button.btn-primary').exists()).toBe(true)
    })
  })
  describe('Emits', () => {
    it('emits toggleEditUserModal when close button is clicked', async () => {
      await wrapper.find('button.btn-circle').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('toggleEditUserModal')
    })

    it('emits updateUser when save button is clicked', async () => {
      await wrapper.find('button.btn-primary').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('updateUser')
    })
  })
  it('updates updateUserInput when name input is changed', async () => {
    const nameInput = wrapper.find('input[placeholder="John Doe"]')
    await nameInput.setValue('Jane Doe')
    expect((wrapper.vm as any).updateUserInput.name).toBe('Jane Doe')
  })
})
