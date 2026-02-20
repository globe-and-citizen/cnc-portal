import { flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditUserForm from '@/components/forms/EditUserForm.vue'
import { createTestingPinia } from '@pinia/testing'
import {
  mockUserData,
  mockUserStore,
  mockToastStore,
  mockUseClipboard,
  createMockMutationResponse,
  mountWithProviders
} from '@/tests/mocks'
import { useUpdateUserMutation } from '@/queries/user.queries'

// Mock window.open for explorer tests
global.window.open = vi.fn()

const createWrapper = () =>
  mountWithProviders(EditUserForm, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        ProfileImageUpload: {
          template: '<div data-test="profile-image-upload"></div>',
          props: ['modelValue'],
          emits: ['update:modelValue']
        }
      }
    }
  })

beforeEach(() => {
  vi.clearAllMocks()
  mockUseClipboard.copied.value = false
  
  // Reset store mocks
  mockUserStore.name = 'John Doe'
  mockUserStore.address = '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
  mockUserStore.imageUrl = 'https://example.com/image.jpg'
  
  // Reset window.open mock
  vi.mocked(window.open).mockClear()
})

describe('EditUserForm', () => {
  describe('Rendering & State', () => {
    it('should render form elements and show submit button only when changes are made', async () => {
      const wrapper = createWrapper()
      
      // Verify initial rendering
      expect(wrapper.find('[data-test="edit-user-modal"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="currency-select"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="profile-image-upload"]').exists()).toBe(true)
      
      // Submit button hidden initially (no changes)
      expect(wrapper.find('[data-test="submit-edit-user"]').exists()).toBe(false)
      
      // Make a change
      const nameInput = wrapper.find('input[data-test="name-input"]')
      await nameInput.setValue('Jane Doe')
      await wrapper.vm.$nextTick()
      
      // Submit button now visible
      expect(wrapper.find('[data-test="submit-edit-user"]').exists()).toBe(true)
    })
  })

  describe('User Interactions', () => {
    it('should handle wallet address actions (view explorer, copy, show feedback)', async () => {
      const wrapper = createWrapper()
      
      // Click address to open explorer
      const address = wrapper.find('span[data-test="user-address"]')
      await address.trigger('click')
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining(mockUserStore.address),
        '_blank'
      )
      
      // Click copy button
      const copyBtn = wrapper.find('button[data-test="copy-address-icon"]')
      await copyBtn.trigger('click')
      expect(mockUseClipboard.copy).toHaveBeenCalledWith(mockUserStore.address)
      
      // Verify copied feedback
      mockUseClipboard.copied.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.find('button[data-test="copied-icon"]').exists()).toBe(true)
    })

    it('should update currency and show success toast', async () => {
      const wrapper = createWrapper()
      
      const select = wrapper.find('select[data-test="currency-select"]')
      await select.trigger('change')
      await flushPromises()
      
      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Currency updated')
    })
  })

  describe('Form Validation', () => {
    it('should prevent submission with invalid name length', async () => {
      const mockMutation = createMockMutationResponse()
      mockMutation.mutateAsync = vi.fn()
      vi.mocked(useUpdateUserMutation).mockReturnValue(mockMutation)
      
      const wrapper = createWrapper()
      const form = wrapper.find('[data-test="edit-user-modal"]')
      const nameInput = wrapper.find('input[data-test="name-input"]')
      
      // Test too short (< 3 characters)
      await nameInput.setValue('Jo')
      await form.trigger('submit')
      await flushPromises()
      expect(mockMutation.mutateAsync).not.toHaveBeenCalled()
      
      // Test too long (> 100 characters)
      mockMutation.mutateAsync.mockClear()
      await nameInput.setValue('a'.repeat(101))
      await form.trigger('submit')
      await flushPromises()
      expect(mockMutation.mutateAsync).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('should submit successfully and provide feedback', async () => {
      const updatedUser = { ...mockUserData, name: 'Jane Doe' }
      const mockMutation = createMockMutationResponse()
      mockMutation.mutateAsync = vi.fn().mockResolvedValue(updatedUser)
      vi.mocked(useUpdateUserMutation).mockReturnValue(mockMutation)
      
      const wrapper = createWrapper()
      const nameInput = wrapper.find('input[data-test="name-input"]')
      await nameInput.setValue('Jane Doe')
      await flushPromises()
      
      const form = wrapper.find('[data-test="edit-user-modal"]')
      await form.trigger('submit')
      await flushPromises()
      
      expect(mockMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          pathParams: { address: mockUserStore.address },
          body: expect.objectContaining({ name: 'Jane Doe' })
        })
      )
      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('User updated')
    })

    it('should handle errors and disable button during submission', async () => {
      // Test error handling
      const mockMutation = createMockMutationResponse()
      mockMutation.mutateAsync = vi.fn().mockRejectedValue(new Error('Update failed'))
      mockMutation.isError.value = true
      vi.mocked(useUpdateUserMutation).mockReturnValue(mockMutation)
      
      const wrapper = createWrapper()
      const nameInput = wrapper.find('input[data-test="name-input"]')
      await nameInput.setValue('Jane Doe')
      await flushPromises()
      
      const form = wrapper.find('[data-test="edit-user-modal"]')
      await form.trigger('submit')
      await flushPromises()
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to update user')
      expect(wrapper.find('div[data-test="error-alert"]').exists()).toBe(true)
    })

    it('should disable submit button while pending and reload after success', async () => {
      vi.useFakeTimers()
      
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true
      })
      
      // Test disabled state during submission
      const mockMutation = createMockMutationResponse()
      mockMutation.isPending.value = true
      mockMutation.mutateAsync = vi.fn().mockResolvedValue(mockUserData)
      vi.mocked(useUpdateUserMutation).mockReturnValue(mockMutation)
      
      const wrapper = createWrapper()
      const nameInput = wrapper.find('input[data-test="name-input"]')
      await nameInput.setValue('Jane Doe')
      await flushPromises()
      
      const submitBtn = wrapper.find('button[data-test="submit-edit-user"]')
      expect((submitBtn.element as HTMLButtonElement).disabled).toBe(true)
      
      // Test reload after success
      mockMutation.isPending.value = false
      const form = wrapper.find('[data-test="edit-user-modal"]')
      await form.trigger('submit')
      await flushPromises()
      
      vi.advanceTimersByTime(2000)
      expect(reloadMock).toHaveBeenCalled()
      
      vi.useRealTimers()
    })
  })
})
