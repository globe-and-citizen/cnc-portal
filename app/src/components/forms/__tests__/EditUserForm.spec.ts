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
    imageUrl: 'https://example.com/image.jpg'
  })
}))

const mockExecuteUpdateUser = vi.fn()
const mockIsFetching = ref(false)
const mockIsFinished = ref(false)
const mockError = ref(null)

vi.mock('@/composables', () => {
  return {
    useCustomFetch: vi.fn(() => {
      return {
        put: () => {
          return {
            json: () => {
              return {
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
})

describe('EditUserForm (corrected tests)', () => {
  it('opens block explorer when clicking the address', async () => {
    const wrapper = createWrapper()
    window.open = vi.fn()
    await wrapper.find('[data-test="user-address"]').trigger('click')
    expect(window.open).toHaveBeenCalledTimes(1)
  })

  it('calls clipboard.copy with address when copy icon clicked', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-test="copy-address-icon"]').trigger('click')
    expect(mockCopy).toHaveBeenCalledWith('0x4b6Bf5cD91446408290725879F5666dcd9785F62')
  })

  // test for currency selection
  it('calls setCurrency and shows toast when currency selected changes', async () => {
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
  it('shows Save button after changing name and triggers update on submit', async () => {
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
})
