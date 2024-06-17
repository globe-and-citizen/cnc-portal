import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DeleteConfirmation from '@/components/modals/DeleteConfirmModal.vue'
import LoadingButton from '@/components/LoadingButton.vue'

describe('DeleteConfirmation.vue', () => {
  let wrapper: ReturnType<typeof mount>

  const createComponent = (propsData: any) => {
    wrapper = mount(DeleteConfirmation, {
      props: {
        ...propsData
      },
      global: {
        components: {
          LoadingButton
        }
      },
      slots: {
        default: 'Are you sure you want to delete this item?'
      }
    })
  }

  beforeEach(() => {
    createComponent({
      showDeleteConfirmModal: true,
      isLoading: false
    })
  })
  describe('Render', () => {
    it('renders correctly with initial props', () => {
      expect(wrapper.find('h3').text()).toBe('Confirmation')
      expect(wrapper.find('p').text()).toBe('Are you sure you want to delete this item?')
    })
    it('displays loading button when isLoading is true', async () => {
      createComponent({
        showDeleteConfirmModal: true,
        isLoading: true
      })
      expect(wrapper.findComponent(LoadingButton).exists()).toBe(true)
    })

    it('displays delete button when isLoading is false', async () => {
      createComponent({
        showDeleteConfirmModal: true,
        isLoading: false
      })
      expect(wrapper.findComponent(LoadingButton).exists()).toBe(false)
      expect(wrapper.find('button.btn-error').exists()).toBe(true)
    })
  })
  describe('Emits', () => {
    it('emits toggleDeleteConfirmModal when close button is clicked', async () => {
      await wrapper.find('button.btn-circle').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('toggleDeleteConfirmModal')
    })

    it('emits deleteItem when delete button is clicked', async () => {
      await wrapper.find('button.btn-error').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('deleteItem')
    })

    it('emits toggleDeleteConfirmModal when cancel button is clicked', async () => {
      await wrapper.find('button.btn-primary').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('toggleDeleteConfirmModal')
    })
  })
})
