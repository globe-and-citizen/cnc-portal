import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ExpenseAccountTable from '../ExpenseAccountTable.vue'
import TableComponent from '@/components/TableComponent.vue'
import { setActivePinia, createPinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import type { ManyExpenseWithBalances } from '@/types'
import { reactive } from 'vue'
import { USDC_ADDRESS } from '@/constant'
import { zeroAddress } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'

const validExpiry = new Date().getTime() / 1000 + 60 * 60
const invalidExpiry = new Date().getTime() / 1000 - 60 * 60

const mockApprovals = reactive<ManyExpenseWithBalances[]>([
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: USDC_ADDRESS,
    budgetData: [
      { budgetType: 0, value: 10 },
      { budgetType: 1, value: 100 },
      { budgetType: 2, value: 10 }
    ],
    expiry: validExpiry,
    signature: `0xSignatureOne`,
    name: `Some One`,
    avatarUrl: null,
    balances: {
      0: `5`,
      1: `50`
    },
    status: 'enabled'
  },
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: USDC_ADDRESS,
    budgetData: [
      { budgetType: 0, value: 11 },
      { budgetType: 1, value: 111 },
      { budgetType: 2, value: 11 }
    ],
    expiry: validExpiry,
    signature: `0xSignaturTwo`,
    name: `Another One`,
    avatarUrl: null,
    balances: {
      0: `5`,
      1: `50`
    },
    status: 'disabled'
  },
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: zeroAddress,
    budgetData: [
      { budgetType: 0, value: 12 },
      { budgetType: 1, value: 123 },
      { budgetType: 2, value: 12 }
    ],
    expiry: invalidExpiry,
    signature: `0xSignatureThree`,
    name: `Last One`,
    avatarUrl: null,
    balances: {
      0: `5`,
      1: `50`
    },
    status: 'expired'
  }
])

describe('ExpenseAccountTable', () => {
  setActivePinia(createPinia())

  interface ComponentOptions {
    props?: Record<string, unknown>
    data?: () => Record<string, unknown>
    global?: Record<string, unknown>
  }

  const createComponent = ({
    props = {},
    data = () => ({}),
    global = {}
  }: ComponentOptions = {}) => {
    return mount(ExpenseAccountTable, {
      props: {
        loading: false,
        approvals: mockApprovals,
        ...props
      },
      data,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { address: '0xInitialUser' }
            }
          })
        ],
        ...global
      }
    })
  }

  describe('Render', () => {
    it('should display filter radio buttons', async () => {
      const wrapper = createComponent()
      expect(wrapper.find('[data-test="status-input-all"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="status-input-enabled"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="status-input-disabled"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="status-input-expired"]').exists()).toBeTruthy()
    })

    it('should filter all approvals', async () => {
      const wrapper = createComponent()
      await flushPromises()
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[0].name)
      const secondRow = expenseAccountTable.find('[data-test="1-row"]')
      expect(secondRow.exists()).toBeTruthy()
      expect(secondRow.html()).toContain(mockApprovals[1].name)
      const thirdRow = expenseAccountTable.find('[data-test="2-row"]')
      expect(thirdRow.exists()).toBeTruthy()
      expect(thirdRow.html()).toContain(mockApprovals[2].name)
      expect(expenseAccountTable.find('[data-test="disable-button"]').exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="enable-button"]').exists()).toBeTruthy()
    })

    it('should filter enabled approvals', async () => {
      const wrapper = createComponent()
      const statusEnabledInput = wrapper.find('[data-test="status-input-enabled"]')
      expect(statusEnabledInput.exists()).toBeTruthy()
      //@ts-expect-error: setChecked for setting the input to checked works instead of click
      await statusEnabledInput.setChecked()
      await flushPromises()
      //@ts-expect-error: custom field of component not available by default
      expect(wrapper.vm.selectedRadio).toBe('enabled')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[0].name)
      expect(expenseAccountTable.find('[data-test="1-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="2-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="disable-button"]').exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="enable-button"]').exists()).toBeFalsy()
    })

    it('should filter disabled approvals', async () => {
      const wrapper = createComponent()
      const statusDisabledInput = wrapper.find('[data-test="status-input-disabled"]')
      expect(statusDisabledInput.exists()).toBeTruthy()
      //@ts-expect-error: setChecked for setting the input to checked works instead of click
      await statusDisabledInput.setChecked()
      await flushPromises()
      //@ts-expect-error: custom field of component not available by default
      expect(wrapper.vm.selectedRadio).toBe('disabled')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[1].name)
      expect(expenseAccountTable.find('[data-test="1-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="2-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="disable-button"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="enable-button"]').exists()).toBeTruthy()
    })

    it('should filter expired approvals', async () => {
      const wrapper = createComponent()
      const statusExpiredInput = wrapper.find('[data-test="status-input-expired"]')
      expect(statusExpiredInput.exists()).toBeTruthy()
      //@ts-expect-error: setChecked for setting the input to checked works instead of click
      await statusExpiredInput.setChecked()
      await flushPromises()
      //@ts-expect-error: custom field of component not available by default
      expect(wrapper.vm.selectedRadio).toBe('expired')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[2].name)
      expect(expenseAccountTable.find('[data-test="1-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="2-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="disable-button"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="enable-button"]').exists()).toBeFalsy()
    })

    it('should show loading button if enabling approval', async () => {
      const wrapper = createComponent({ props: { loading: true } })
      const statusDisabledInput = wrapper.find('[data-test="status-input-disabled"]')
      expect(statusDisabledInput.exists()).toBeTruthy()
      //@ts-expect-error: setChecked for setting the input to checked works instead of click
      await statusDisabledInput.setChecked()
      await flushPromises()
      //@ts-expect-error: custom field of component not available by default
      expect(wrapper.vm.selectedRadio).toBe('disabled')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[1].name)
      const disableButton = firstRow.findComponent(ButtonUI)
      expect(disableButton.exists()).toBeTruthy()
      disableButton.trigger('click')
      await flushPromises()
      expect(disableButton.props('loading')).toBe(true)
    })

    it('should show loading button if disabling approvals', async () => {
      const wrapper = createComponent({ props: { loading: true } })
      const statusEnabledInput = wrapper.find('[data-test="status-input-enabled"]')
      expect(statusEnabledInput.exists()).toBeTruthy()
      //@ts-expect-error: setChecked for setting the input to checked works instead of click
      await statusEnabledInput.setChecked()
      await flushPromises()
      //@ts-expect-error: custom field of component not available by default
      expect(wrapper.vm.selectedRadio).toBe('enabled')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[0].name)
      const enableButton = firstRow.findComponent(ButtonUI)
      expect(enableButton.exists()).toBeTruthy()
      enableButton.trigger('click')
      await flushPromises()
      expect(enableButton.props('loading')).toBe(true)
    })
  })
})
