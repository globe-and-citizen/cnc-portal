import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ExpenseAccountSection from '@/components/sections/SingleTeamView/ExpenseAccountSection.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
//import {  } from '@/composables/useExpenseAccount'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { NETWORK } from '@/constant'
import { error } from 'console'
import {
  useDeployExpenseAccountContract,
  useExpenseAccountGetBalance,
  useExpenseAccountGetMaxLimit
} from '@/composables/useExpenseAccount'

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  }))
}))

const mockCopy = vi.fn()
const mockClipboard = {
  copy: mockCopy,
  copied: ref(false),
  isSupported: ref(true)
}

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    useClipboard: vi.fn(() => mockClipboard)
  }
})

// const mockExecuteDeployExpenseAccount = vi.fn()
const mockDeployExpenseAccount = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref<any>(null),
  execute: vi.fn()
}

const mockExpenseAccountGetBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref<any>(null),
  execute: vi.fn()
}

const mockExpenseAccountGetMaxLimit = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref<any>(null),
  execute: vi.fn()
}

vi.mock('@/composables/useExpenseAccount', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    useExpenseAccountGetMaxLimit: vi.fn(() => mockExpenseAccountGetMaxLimit),
    useExpenseAccountGetBalance: vi.fn(() => mockExpenseAccountGetBalance),
    useDeployExpenseAccountContract: vi.fn(() => mockDeployExpenseAccount)
  }
})

describe('ExpenseAccountSection', () => {
  setActivePinia(createPinia())

  const createComponent = (props?: any) => {
    return mount(ExpenseAccountSection, {
      props: {
        team: {
          expenseAccountAddress: '0x8aCd85898458400f7Db866d53FCFF6f0D49741FF',
          ownerAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          ...props?.team
        },
        ...props
      }
    })
  }

  describe('Render', () => {
    it('should show expense account if expense account address exists', () => {
      const team = { expenseAccountAddress: '0x123' }
      const wrapper = createComponent({
        team: {
          ...team
        }
      })

      expect(wrapper.find('[data-test="expense-account-address"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="expense-account-address"]').text()).toBe(
        team.expenseAccountAddress
      )

      // ToolTip
      const expenseAccountAddressTooltip = wrapper
        .find('[data-test="expense-account-address-tooltip"]')
        .findComponent({ name: 'ToolTip' })
      expect(expenseAccountAddressTooltip.exists()).toBeTruthy()
      expect(expenseAccountAddressTooltip.props().content).toBe(
        'Click to see address in block explorer'
      )
    })
    it('should show create expense account button if expense account is not deployed', () => {
      const team = { expenseAccountAddress: null }
      const wrapper = createComponent({
        team: {
          ...team
        }
      })

      expect(wrapper.find('[data-test="create-expense-account"]').exists()).toBeTruthy()
    })
    it('should show loading button if contract is being deployed', async () => {
      const team = { expenseAccountAddress: null }
      const wrapper = createComponent({
        team: {
          ...team
        }
      })

      mockDeployExpenseAccount.isLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="loading-create-expense-account"]').exists()).toBeTruthy()
    })
    it('should hide create button if contract is being deployed', async () => {
      const team = { expenseAccountAddress: null }
      const wrapper = createComponent({
        team: {
          ...team
        }
      })

      mockDeployExpenseAccount.isLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="create-expense-account"]').exists()).toBeFalsy()
    })
    it('should show copy to clipboard icon with tooltip if expense account address exists', () => {
      const wrapper = createComponent()

      expect(wrapper.findComponent(ClipboardDocumentListIcon).exists()).toBe(true)

      // ToolTip
      const copyAddressTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(copyAddressTooltip.exists()).toBeTruthy()
      expect(copyAddressTooltip.props().content).toBe('Click to copy address')
    })
    it('should not show copy to clipboard icon if copy not supported', async () => {
      const wrapper = createComponent()

      // mock clipboard
      mockClipboard.isSupported.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ClipboardDocumentListIcon).exists()).toBe(false)
    })

    it('should change the copy icon when copied', async () => {
      const wrapper = createComponent()

      // mock clipboard
      mockClipboard.isSupported.value = false
      mockClipboard.copied.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ClipboardDocumentCheckIcon).exists()).toBe(true)
    })
    it('should change tooltip text to be "Copied!" when copied', async () => {
      const wrapper = createComponent()

      // mock clipboard
      mockClipboard.isSupported.value = false
      mockClipboard.copied.value = true
      await wrapper.vm.$nextTick()

      const copyAddressTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(copyAddressTooltip.props().content).toBe('Copied!')
    })
    it('should show animation if balance loading', async () => {
      const wrapper = createComponent()

      mockExpenseAccountGetBalance.isLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="balance-loading"]').exists()).toBeTruthy()
    })
    it('should show animation if balance not present', async () => {
      const wrapper = createComponent()

      mockExpenseAccountGetBalance.data.value = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="balance-loading"]').exists()).toBeTruthy()
    })
    it('should show expense account balance', async () => {
      const wrapper = createComponent()

      const balance = '0.0'
      mockExpenseAccountGetBalance.data.value = balance
      mockExpenseAccountGetBalance.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="contract-balance"]').text()).toBe(
        `${balance} ${NETWORK.currencySymbol}`
      )
    })

    it('should show animation if max limit loading', async () => {
      const wrapper = createComponent()

      mockExpenseAccountGetMaxLimit.isLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="max-limit-loading"]').exists()).toBeTruthy()
    })
    it('should show animation if max limit not present', async () => {
      const wrapper = createComponent()

      mockExpenseAccountGetMaxLimit.isLoading.value = false
      mockExpenseAccountGetMaxLimit.data.value = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="max-limit-loading"]').exists()).toBeTruthy()
    })
    it('should show max limit amount', async () => {
      const wrapper = createComponent()

      const maxLimit = '0.0'
      mockExpenseAccountGetMaxLimit.data.value = maxLimit
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="max-limit"]').text()).toBe(
        `${maxLimit} ${NETWORK.currencySymbol}`
      )
    })
  })
})
