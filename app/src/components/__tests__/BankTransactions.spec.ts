import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BankTransactions from '@/components/BankTransactions.vue'
import DepositHistory from '@/components/bank-history/DepositHistory.vue'
import TransferHistory from '@/components/bank-history/TransferHistory.vue'
import TipsAddressChangedHistory from '@/components/bank-history/TipsAddressChangedHistory.vue'
import SendToWalletHistory from '@/components/bank-history/SendToWalletHistory.vue'
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

describe('BankTransactions.vue', () => {
  let wrapper: any

  const depositEvents: EventResult[] = [
    { txHash: '0x1', data: ['0xAddress1', '1000000000000000000'] as Result, date: '2024-06-25' }
  ]
  const transferEvents: EventResult[] = [
    {
      txHash: '0x2',
      data: ['0xSender', '0xRecipient', '2000000000000000000'] as Result,
      date: '2024-06-25'
    }
  ]
  const tipsAddressChangedEvents: EventResult[] = [
    {
      txHash: '0x3',
      data: ['0xOwner', '0xOldAddress', '0xNewAddress'] as Result,
      date: '2024-06-25'
    }
  ]
  const sendToWalletEvents: EventResult[] = [
    {
      txHash: '0x4',
      data: ['0xOwner', ['0xMember1', '0xMember2'], '3000000000000000000'] as Result,
      date: '2024-06-25'
    }
  ]

  beforeEach(() => {
    wrapper = mount(BankTransactions, {
      props: {
        depositEvents,
        depositEventLoading: false,
        transferEvents,
        transferEventLoading: false,
        tipsAddressChangedEvents,
        tipsAddressChangedEventLoading: false,
        sendToWalletEvents,
        sendToWalletEventLoading: false
      }
    })
  })

  it('passes props to DepositHistory component', () => {
    const depositHistory = wrapper.findComponent(DepositHistory)
    expect(depositHistory.exists()).toBe(true)
    expect(depositHistory.props().depositEvents).toMatchObject(depositEvents)
    expect(depositHistory.props().depositEventLoading).toBe(false)
  })

  it('passes props to TransferHistory component', () => {
    const transferHistory = wrapper.findComponent(TransferHistory)
    expect(transferHistory.exists()).toBe(true)
    expect(transferHistory.props().transferEvents).toMatchObject(transferEvents)
    expect(transferHistory.props().transferEventLoading).toBe(false)
  })

  it('passes props to TipsAddressChangedHistory component', () => {
    const tipsAddressChangedHistory = wrapper.findComponent(TipsAddressChangedHistory)
    expect(tipsAddressChangedHistory.exists()).toBe(true)
    expect(tipsAddressChangedHistory.props().tipsAddressChangedEvents).toMatchObject(
      tipsAddressChangedEvents
    )
    expect(tipsAddressChangedHistory.props().tipsAddressChangedEventLoading).toBe(false)
  })

  it('passes props to SendToWalletHistory component', () => {
    const sendToWalletHistory = wrapper.findComponent(SendToWalletHistory)
    expect(sendToWalletHistory.exists()).toBe(true)
    expect(sendToWalletHistory.props().sendToWalletEvents).toMatchObject(sendToWalletEvents)
    expect(sendToWalletHistory.props().sendToWalletEventLoading).toBe(false)
  })

  it('emits events on mounted', () => {
    const emitted = wrapper.emitted()
    expect(emitted.getDepositEvents).toBeTruthy()
    expect(emitted.getTransferEvents).toBeTruthy()
    expect(emitted.getTipsAddressChangedEvents).toBeTruthy()
    expect(emitted.getSendToWalletEvents).toBeTruthy()
  })
})
