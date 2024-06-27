import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TransferHistory from '@/components/bank-history/TransferHistory.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import type { EventResult } from '@/types'
import type { Result } from 'ethers'

vi.mock('@/adapters/web3LibraryAdapter', () => {
  return {
    EthersJsAdapter: {
      getInstance: () => ({
        formatEther: vi.fn((value) => (value / 1e18).toFixed(2)) // Mock implementation
      })
    }
  }
})

const transferEvents: EventResult[] = [
  {
    txHash: '0x1',
    data: ['0xSender1', '0xRecipient1', '1000000000000000000'] as Result, // 1 ETH
    date: '2024-06-25'
  },
  {
    txHash: '0x2',
    data: ['0xSender2', '0xRecipient2', '2500000000000000000'] as Result, // 2.5 ETH
    date: '2024-06-26'
  }
]

describe('TransferHistory.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(TransferHistory, {
      props: {
        transferEvents: [],
        transferEventLoading: true
      },
      global: {
        components: {
          SkeletonLoading
        }
      }
    })
  })

  it('renders skeleton loader when loading', () => {
    expect(wrapper.findComponent(SkeletonLoading).exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders table when not loading and transfer events exist', async () => {
    await wrapper.setProps({ transferEventLoading: false, transferEvents })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr').length).toBe(2)
  })

  it('renders no transfer transactions message when not loading and no transfer events exist', async () => {
    await wrapper.setProps({ transferEventLoading: false, transferEvents: [] })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr').length).toBe(1)
    expect(wrapper.find('tbody tr td').text()).toBe('No transfer transactions')
  })

  it('opens transaction detail in a new window when a row is clicked', async () => {
    global.open = vi.fn() // Mock window.open
    await wrapper.setProps({ transferEventLoading: false, transferEvents })

    await wrapper.findAll('tbody tr')[0].trigger('click')
    expect(global.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
  })

  it('correctly formats ether amounts using the mocked EthersJsAdapter', async () => {
    await wrapper.setProps({ transferEventLoading: false, transferEvents })
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].find('td:nth-child(4)').text()).toBe('1.00 SepoliaETH')
    expect(rows[1].find('td:nth-child(4)').text()).toBe('2.50 SepoliaETH')
  })
})
