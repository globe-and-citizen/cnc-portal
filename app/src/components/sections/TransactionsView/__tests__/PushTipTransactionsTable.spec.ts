import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'
import PushTipTransactionsTable from '@/components/sections/TransactionsView/tables/PushTipTransactionsTable.vue'
import { ref } from 'vue'
import { useTipEvents } from '@/composables/__mocks__/tips.mock'
import type { Result } from 'ethers'

// Mock the composables and other dependencies
vi.mock('@/composables/tips')

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    addErrorToast: vi.fn()
  })
}))

vi.mock('@/constant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constant')>()
  return {
    ...actual,
    NETWORK: {
      blockExplorerUrl: 'https://etherscan.io'
    }
  }
})

window.open = vi.fn()

describe('PushTipTransactionsTable.vue', () => {
  test('renders correctly when no data', () => {
    const wrapper = mount(PushTipTransactionsTable)

    expect(wrapper.find('h2').text()).toBe('PushTip Transactions')
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.find('tbody').text()).toContain('No PushTip Transactions')
  })

  test('renders table with events', async () => {
    useTipEvents.mockReturnValueOnce({
      events: ref([
        {
          txHash: '0x123',
          data: ['0xABC', ['0xDEF'], '1000000000000000000', '100000000000000000'] as Result,
          date: '2024-09-09'
        }
      ]),
      loading: ref(false),
      error: ref(null)
    })

    const wrapper = mount(PushTipTransactionsTable)
    await wrapper.vm.$nextTick() // Wait for reactivity to settle

    expect(wrapper.find('tbody').text()).toContain('0xABC')
    expect(wrapper.find('tbody').text()).toContain('1 ETH')
    expect(wrapper.find('tbody').text()).toContain('0.1 ETH')
    expect(wrapper.find('tbody').text()).toContain('2024-09-09')
  })

  test('renders loading skeleton when loading', async () => {
    const wrapper = mount(PushTipTransactionsTable)
    // useTipEvents.loading.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'SkeletonLoading' }).exists()).toBe(true)
  })

  test('emits when clicking on a transaction', async () => {
    // useTipEvents.events.value = [
    //   {
    //     txHash: '0x123',
    //     data: ['0xABC', ['0xDEF'], '1000000000000000000', '100000000000000000'] as Result,
    //     date: '2024-09-09'
    //   }
    // ]

    const wrapper = mount(PushTipTransactionsTable)
    await wrapper.vm.$nextTick() // Wait for reactivity to settle

    // Simulate click on the transaction row
    const row = wrapper.find('tr.cursor-pointer')
    await row.trigger('click')

    expect(window.open).toHaveBeenCalledWith('https://etherscan.io/tx/0x123', '_blank')
  })
})
