import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import EditUserForm from '@/components/forms/EditUserForm.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'
import { NETWORK } from '@/constant'

const mockCopy = vi.fn()
const mockClipboard = {
  copy: mockCopy,
  copied: ref(false),
  isSupported: ref(true)
}
vi.mock('@vueuse/core', () => ({
  useClipboard: vi.fn(() => mockClipboard)
}))

describe('EditUserForm', () => {
  const user = {
    name: 'John Doe',
    address: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
  }

  const createComponent = (props?: {
    isLoading?: boolean
    modelValue?: {
      name: string
      address: string
    }
  }) => {
    return mount(EditUserForm, {
      props: {
        isLoading: false,
        modelValue: user,
        ...props
      }
    })
  }

  describe('Render', () => {
    it('renders label and input for name correctly', () => {
      const wrapper = createComponent()
      expect(wrapper.find('span[data-test="name-label"]').text()).toBe('Name')
      expect(wrapper.find('input[data-test="name-input"]').exists()).toBeTruthy()
      expect(wrapper.props().modelValue?.name).toBe(user.name)
    })

    it('renders label and address with tooltip correctly', () => {
      const wrapper = createComponent()
      expect(wrapper.find('span[data-test="address-label"]').text()).toBe('Wallet Address')
      expect(wrapper.find('div[data-test="user-address"]').text()).toBe(user.address)

      // Tooltip
      const addressTooltip = wrapper.find('[data-test="address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(addressTooltip.props().content).toBe('Click to see address in block explorer')
    })

    it('renders copy address icon correctly', () => {
      const wrapper = createComponent()
      expect(wrapper.findComponent(ClipboardDocumentListIcon).exists()).toBeTruthy()

      // Tooltip
      const copyIconTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(copyIconTooltip.props().content).toBe('Click to copy address')
    })

    it('renders copied icon when copied', async () => {
      const wrapper = createComponent()
      mockClipboard.copied.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(ClipboardDocumentCheckIcon).exists()).toBeTruthy()
    })

    it('renders submit button correctly', () => {
      const wrapper = createComponent()
      expect(wrapper.find('button[data-test="submit-edit-user"]').text()).toBe('Save')
    })

    it('renders loading button if isLoading true', async () => {
      const wrapper = createComponent({ isLoading: true })
      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBeTruthy()
      expect(wrapper.find('button[data-test="submit-edit-user"]').exists()).toBeFalsy()
    })
  })

  describe('Emits', () => {
    it('emits submitEditUser when submit button is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('button[data-test="submit-edit-user"]').trigger('click')
      expect(wrapper.emitted('submitEditUser')).toBeTruthy()
    })

    it('opens new tab when address is clicked', async () => {
      const wrapper = createComponent()

      // mock window.open
      window.open = vi.fn()

      await wrapper.find('[data-test="user-address"]').trigger('click')

      expect(window.open).toBeCalledWith(
        `${NETWORK.blockExplorerUrl}/address/${user.address}`,
        '_blank'
      )
    })

    it('copies address when copy icon is clicked', async () => {
      const wrapper = createComponent()

      // mock clipboard
      mockClipboard.isSupported.value = true
      mockClipboard.copied.value = false
      await wrapper.vm.$nextTick()

      await wrapper.findComponent(ClipboardDocumentListIcon).trigger('click')

      expect(mockCopy).toBeCalledWith(user.address)
    })
  })
  describe('Form Validation', () => {
    it('displays error message when name is empty', async () => {
      const wrapper = createComponent()
      await wrapper.find('input[data-test="name-input"]').setValue('')
      await wrapper.find('button[data-test="submit-edit-user"]').trigger('click')

      expect(wrapper.find('[data-test="name-error"]').text()).toBe('Value is required')
    })
  })
})
