import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DepositHistory from '@/components/bank-history/DepositHistory.vue'
import { NETWORK } from '@/constant'
import type { EventResult } from '@/types'
import type { Result } from 'ethers'

const depositEvents: EventResult[] = [
  {
    txHash: '0x1',
    data: ['0xDepositor1', '1000000000000000000'] as Result, // 1 ETH
    date: '2024-06-25'
  },
  {
    txHash: '0x2',
    data: ['0xDepositor2', '2000000000000000000'] as Result, // 2 ETH
    date: '2024-06-26'
  }
]
vi.mock('@/adapters/web3LibraryAdapter', () => {
  return {
    EthersJsAdapter: {
      getInstance: () => ({
        formatEther: vi.fn((value) => (value / 1e18).toString()) // Mock implementation
      })
    }
  }
})

describe('DepositHistory.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(DepositHistory, {
      props: {
        depositEvents: [],
        depositEventLoading: true
      }
    })
  })

  it('renders skeleton loader when loading', () => {
    expect(wrapper.findComponent({ name: 'SkeletonLoading' }).exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders table when not loading and deposit events exist', async () => {
    await wrapper.setProps({ depositEventLoading: false, depositEvents })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr').length).toBe(2)
  })

  it('renders no deposit transactions message when not loading and no deposit events exist', async () => {
    await wrapper.setProps({ depositEventLoading: false, depositEvents: [] })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr').length).toBe(1)
    expect(wrapper.find('tbody tr td').text()).toBe('No Deposit transactions')
  })

  it('opens transaction detail in a new window when a row is clicked', async () => {
    global.open = vi.fn() // Mock window.open
    await wrapper.setProps({ depositEventLoading: false, depositEvents })

    await wrapper.findAll('tbody tr')[0].trigger('click')
    expect(global.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
  })

  it('correctly formats ether amounts using the mocked EthersJsAdapter', async () => {
    await wrapper.setProps({ depositEventLoading: false, depositEvents })
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].find('td:nth-child(3)').text()).toBe('1 SepoliaETH')
    expect(rows[1].find('td:nth-child(3)').text()).toBe('2 SepoliaETH')
  })
})
