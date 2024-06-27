import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SendToWalletHistory from '@/components/bank-history/SendToWalletHistory.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import type { EventResult } from '@/types'
import type { Result } from 'ethers'

vi.mock('@/adapters/web3LibraryAdapter', () => {
  return {
    EthersJsAdapter: {
      getInstance: () => ({
        formatEther: vi.fn((value) => (value / 1e18).toString()) // Mock implementation
      })
    }
  }
})

const sendToWalletEvents: EventResult[] = [
  {
    txHash: '0x1',
    data: ['0xOwner1', ['0xMember1', '0xMember2'], '3000000000000000000'] as Result, // 3 ETH
    date: '2024-06-25'
  },
  {
    txHash: '0x2',
    data: ['0xOwner2', ['0xMember3'], '1500000000000000000'] as Result, // 1.5 ETH
    date: '2024-06-26'
  }
]

describe('SendToWalletHistory.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(SendToWalletHistory, {
      props: {
        sendToWalletEvents: [],
        sendToWalletEventLoading: true
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

  it('renders table when not loading and send to wallet events exist', async () => {
    await wrapper.setProps({ sendToWalletEventLoading: false, sendToWalletEvents })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr').length).toBe(2)
  })

  it('renders no send to wallet transactions message when not loading and no send to wallet events exist', async () => {
    await wrapper.setProps({ sendToWalletEventLoading: false, sendToWalletEvents: [] })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr').length).toBe(1)
    expect(wrapper.find('tbody tr td').text()).toBe('No send to wallet history')
  })

  it('opens transaction detail in a new window when a row is clicked', async () => {
    global.open = vi.fn() // Mock window.open
    await wrapper.setProps({ sendToWalletEventLoading: false, sendToWalletEvents })

    await wrapper.findAll('tbody tr')[0].trigger('click')
    expect(global.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
  })

  it('correctly formats ether amounts using the mocked EthersJsAdapter', async () => {
    await wrapper.setProps({ sendToWalletEventLoading: false, sendToWalletEvents })
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].find('td:nth-child(4)').text()).toBe('3 SepoliaETH')
    expect(rows[1].find('td:nth-child(4)').text()).toBe('1.5 SepoliaETH')
  })
})
