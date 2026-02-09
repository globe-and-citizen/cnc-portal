import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExpenseAccountTable from '../ExpenseAccountTable.vue'
import TableComponent from '@/components/TableComponent.vue'
import { setActivePinia, createPinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { USDC_ADDRESS } from '@/constant'
import { zeroAddress } from 'viem'
import { useGetExpensesQuery } from '@/queries'

const START_DATE = new Date().getTime() / 1000 + 60 * 60
const END_DATE = new Date().getTime() / 1000 + 2 * 60 * 60

const mockApprovals = [
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: USDC_ADDRESS,
    amount: 150,
    frequencyType: 0,
    customFrequency: 0,
    startDate: START_DATE,
    endDate: END_DATE,
    signature: `0xSignatureOne`,
    name: `Some One`,
    avatarUrl: null,
    balances: {
      0: `5`,
      1: `50`
    },
    status: 'enabled',
    user: {
      address: '0x1234567890123456789012345678901234567890',
      name: 'User One',
      avatarUrl: null
    }
  },
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: USDC_ADDRESS,
    amount: 500,
    frequencyType: 1,
    customFrequency: 0,
    startDate: START_DATE,
    endDate: END_DATE,
    signature: `0xSignaturTwo`,
    name: `Another One`,
    avatarUrl: null,
    balances: {
      0: `5`,
      1: `50`
    },
    status: 'disabled',
    user: {
      address: '0x1234567890123456789012345678901234567890',
      name: 'User Two',
      avatarUrl: null
    }
  },
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: zeroAddress,
    amount: 10,
    frequencyType: 4,
    customFrequency: 3 * 24 * 60 * 60,
    startDate: START_DATE,
    endDate: END_DATE,
    signature: `0xSignatureThree`,
    name: `Last One`,
    avatarUrl: null,
    balances: {
      0: `5`,
      1: `50`
    },
    status: 'expired',
    user: {
      address: '0x1234567890123456789012345678901234567890',
      name: 'User Three',
      avatarUrl: null
    }
  }
]

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ params: { id: 1 } }))
  }
})

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    parseSignature: vi.fn(),
    hashTypedData: vi.fn(),
    keccak256: vi.fn()
  }
})

vi.mock('@/composables/useCustomFetch', () => {
  return {
    useCustomFetch: vi.fn()
  }
})

vi.mock('@/queries', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useGetExpensesQuery: vi.fn()
  }
})

describe('ExpenseAccountTable - Filtering', () => {
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

  beforeEach(() => {
    vi.mocked(useGetExpensesQuery).mockReturnValue({
      data: ref(mockApprovals),
      isLoading: ref(false)
    } as ReturnType<typeof useGetExpensesQuery>)
  })

  describe('Filtering', () => {
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
      expect(firstRow.findComponent({ name: 'UserComponent' })).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[0].user.name)
      const secondRow = expenseAccountTable.find('[data-test="1-row"]')
      expect(secondRow.exists()).toBeTruthy()
      expect(secondRow.html()).toContain(mockApprovals[1].user.name)
      const thirdRow = expenseAccountTable.find('[data-test="2-row"]')
      expect(thirdRow.exists()).toBeTruthy()
      expect(thirdRow.html()).toContain(mockApprovals[2].user.name)
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
      expect(wrapper.vm.selectedRadio).toBe('enabled')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[0].amount)
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
      expect(wrapper.vm.selectedRadio).toBe('disabled')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[1].amount)
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
      expect(wrapper.vm.selectedRadio).toBe('expired')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[2].amount)
      expect(firstRow.html()).toContain('3 day(s)')
      expect(expenseAccountTable.find('[data-test="1-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="2-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="disable-button"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="enable-button"]').exists()).toBeFalsy()
    })
  })
})
