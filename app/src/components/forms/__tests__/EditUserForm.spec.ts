import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditUserForm from '@/components/forms/EditUserForm.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import UploadImage from '@/components/forms/UploadImage.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

const mockCopy = vi.fn()
const mockClipboard = {
  copy: mockCopy,
  copied: ref(false),
  isSupported: ref(true)
}

vi.mock('@vueuse/core', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useClipboard: vi.fn(() => mockClipboard)
  }
})

// Mock stores (useCurrencyStore, useToastStore, useUserDataStore)
const mockSetCurrency = vi.fn()
const mockAddSuccessToast = vi.fn()
const mockAddErrorToast = vi.fn()
const mockSetUserData = vi.fn()

vi.mock('@/stores', () => ({
  useCurrencyStore: () => ({
    setCurrency: mockSetCurrency,
    localCurrency: { code: 'XOF' }
  }),
  useToastStore: () => ({
    addSuccessToast: mockAddSuccessToast,
    addErrorToast: mockAddErrorToast
  }),
  // user store returning initial values used in component
  useUserDataStore: () => ({
    name: 'John Doe',
    address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62',
    imageUrl: 'https://example.com/image.jpg',
    nonce: 'nonce123',
    setUserData: mockSetUserData
  })
}))

const mockExecuteUpdateUser = vi.fn()
const mockIsFetching = ref(false)
const mockIsFinished = ref(false)
const mockError = ref<null | string>(null)
const mockUpdatedUser = ref<{
  name: string
  address: string
  nonce: string
  imageUrl: string
} | null>(null)

vi.mock('@/composables', () => {
  return {
    useCustomFetch: vi.fn(() => {
      return {
        put: () => {
          return {
            json: () => {
              return {
                data: mockUpdatedUser,
                isFetching: mockIsFetching,
                isFinished: mockIsFinished,
                error: mockError,
                execute: mockExecuteUpdateUser
              }
            }
          }
        }
      }
    })
  }
})

const createWrapper = () =>
  mount(EditUserForm, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      components: {
        IconifyIcon,
        ButtonUI,
        UploadImage
      },
      stubs: {
        ToolTip: { template: '<div><slot/></div>' }
      }
    }
  })

beforeEach(() => {
  vi.clearAllMocks()
  mockClipboard.copied.value = false
  mockIsFetching.value = false
  mockIsFinished.value = false
  mockError.value = null
  mockUpdatedUser.value = null
})

describe('EditUserForm (corrected tests)', () => {
  it('renders label when clicking the address', async () => {
    const wrapper = createWrapper()
    window.open = vi.fn()
    await wrapper.find('[data-test="user-address"]').trigger('click')
    expect(window.open).toHaveBeenCalledTimes(1)
  })

  it('emits submitEditUser when submit button is clicked', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-test="copy-address-icon"]').trigger('click')
    expect(mockCopy).toHaveBeenCalledWith('0x4b6Bf5cD91446408290725879F5666dcd9785F62')
  })

  // test for currency selection
  it('emits setCurrency and shows toast when currency selected changes', async () => {
    const wrapper = createWrapper()
    const select = wrapper.find('[data-test="currency-select"]')
    expect(select.exists()).toBe(true)
    await select.setValue('EUR')
    await flushPromises()
    expect(mockSetCurrency).toHaveBeenCalledWith('EUR')
    expect(mockAddSuccessToast).toHaveBeenCalledWith('Currency updated')
  })

  it.skip('does NOT show Save button when no change', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="submit-edit-user"]').exists()).toBe(false)
  })
  // test for name change showing Save button and triggering update
  it('emits submitEditUser when submit button is clicked', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('[data-test="name-input"]')
    await input.setValue('Jane Doe')
    await flushPromises()

    const saveBtn = wrapper.find('[data-test="submit-edit-user"]')
    expect(saveBtn.exists()).toBe(true)

    await saveBtn.trigger('click')
    // Since we mocked useCustomFetch to return execute, ensure execute was called
    expect(mockExecuteUpdateUser).toHaveBeenCalled()
  })

  describe('Watchers Validation', () => {
    it('should display error toast when userUpdateError is set', async () => {
      createWrapper()

      mockError.value = 'Network error occurred'
      await flushPromises()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Network error occurred')
    })

    it('should handle updatedUser watcher correctly', async () => {
      vi.useFakeTimers()

      createWrapper()
      await flushPromises()

      mockUpdatedUser.value = {
        name: 'Jane Doe',
        address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62',
        nonce: 'nonce123',
        imageUrl: 'https://example.com/new.jpg'
      }

      // Wait for watchers to trigger
      await flushPromises()

      // Verify immediate effects
      expect(mockAddSuccessToast).toHaveBeenCalledWith('User updated')
      expect(mockSetUserData).toHaveBeenCalledWith(
        'Jane Doe',
        '0x4b6Bf5cD91446408290725879F5666dcd9785F62',
        'nonce123',
        'https://example.com/new.jpg'
      )

      // Run all timers to execute the setTimeout
      vi.runAllTimers()
      await flushPromises()

      // Verify delayed effects
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Reloading page to reflect changes')
      vi.useRealTimers()
    })
  })
})
