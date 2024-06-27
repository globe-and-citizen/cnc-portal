import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TipsAddressChanged from '@/components/bank-history/TipsAddressChangedHistory.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import type { EventResult } from '@/types'
import type { Result } from 'ethers'

const tipsAddressChangedEvents: EventResult[] = [
  {
    txHash: '0x1',
    data: ['0xOwner1', '0xOldTips1', '0xNewTips1'] as Result,
    date: '2024-06-25'
  },
  {
    txHash: '0x2',
    data: ['0xOwner2', '0xOldTips2', '0xNewTips2'] as Result,
    date: '2024-06-26'
  }
]

describe('TipsAddressChanged.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(TipsAddressChanged, {
      props: {
        tipsAddressChangedEvents: [],
        tipsAddressChangedEventLoading: true
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

  it('renders table when not loading and tips address changed events exist', async () => {
    await wrapper.setProps({ tipsAddressChangedEventLoading: false, tipsAddressChangedEvents })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr').length).toBe(2)
  })

  it('renders no tips address transactions message when not loading and no tips address changed events exist', async () => {
    await wrapper.setProps({ tipsAddressChangedEventLoading: false, tipsAddressChangedEvents: [] })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr').length).toBe(1)
    expect(wrapper.find('tbody tr td').text()).toBe('No tips address transactions')
  })

  it('opens transaction detail in a new window when a row is clicked', async () => {
    global.open = vi.fn() // Mock window.open
    await wrapper.setProps({ tipsAddressChangedEventLoading: false, tipsAddressChangedEvents })

    await wrapper.findAll('tbody tr')[0].trigger('click')
    expect(global.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
  })
})
