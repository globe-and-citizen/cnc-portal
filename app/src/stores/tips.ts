import { ethers } from 'ethers'
import { defineStore } from 'pinia'
import { TIPS_ADDRESS } from '@/constant'
import ABI from '../abi/tips.json'
import { ToastType, TipsEventType } from '@/types'
import { useToastStore } from './toast'
import type { AddressLike } from 'ethers'
import type { EventLog } from 'ethers'
import type { Log } from 'ethers'

let contract: ethers.Contract
let provider: ethers.BrowserProvider

export const useTipsStore = defineStore('tips', {
  state: () => ({
    contract: null as ethers.Contract | null,
    sendTipLoading: false as boolean,
    pushTipLoading: false as boolean,
    isWalletConnected: false as boolean,
    totalTipAmount: 0 as number,
    balance: '0' as string
  }),
  actions: {
    async connectWallet() {
      if (this.isWalletConnected) return

      const { show } = useToastStore()
      if (!(window as any).ethereum) {
        show(ToastType.Info, 'Please install Metamask')
        return
      }

      provider = new ethers.BrowserProvider((window as any).ethereum)
      await provider.send('eth_requestAccounts', [])
      contract = new ethers.Contract(TIPS_ADDRESS, ABI, await provider.getSigner())
      this.isWalletConnected = true
    },
    async pushTip(addresses: AddressLike[]) {
      const { show } = useToastStore()

      if (this.totalTipAmount === 0) {
        show(ToastType.Info, 'Please enter amount to tip')
        return
      }

      if (!this.isWalletConnected) await this.connectWallet()

      this.pushTipLoading = true

      try {
        const tx = await this.contract!.pushTip(addresses, {
          value: ethers.parseEther(this.totalTipAmount.toString())
        })
        await tx.wait()

        show(ToastType.Success, 'Tip pushed successfully')
      } catch (error) {
        show(ToastType.Error, 'Failed to push tip')
      } finally {
        this.pushTipLoading = false
        this.totalTipAmount = 0
      }
    },
    async sendTip(addresses: AddressLike[]) {
      const { show } = useToastStore()
      if (this.totalTipAmount === 0) {
        show(ToastType.Info, 'Please enter amount to tip')
        return
      }

      if (!this.isWalletConnected) await this.connectWallet()

      this.sendTipLoading = true

      try {
        const tx = await this.contract!.sendTip(addresses, {
          value: ethers.parseEther(this.totalTipAmount.toString())
        })
        await tx.wait()
        await this.getBalance()

        show(ToastType.Success, 'Tip sent successfully')
      } catch (error) {
        show(ToastType.Error, 'Failed to send tip')
      } finally {
        this.sendTipLoading = false
        this.totalTipAmount = 0
      }
    },
    async getBalance() {
      if (!this.isWalletConnected) await this.connectWallet()
      let address = (await provider.getSigner()).address

      this.balance = ethers.formatEther(await this.contract!.getBalance(address))
    },
    async withdrawTips() {
      if (!this.isWalletConnected) await this.connectWallet()

      const { show } = useToastStore()

      if (this.balance == '0') {
        show(ToastType.Info, 'No tips to withdraw')
        return
      }

      try {
        const tx = await this.contract!.withdraw()
        await tx.wait()

        await this.getBalance()
        show(ToastType.Success, 'Tips withdrawn successfully')
      } catch (error) {
        show(ToastType.Error, 'Failed to withdraw tips')
      }
    },
    async getEvents(event: TipsEventType) {
      if (!this.isWalletConnected) await this.connectWallet()

      try {
        const events = await this.contract!.queryFilter(event)

        const result = events.map(async (eventData: EventLog | Log) => {
          const timestamp = (await eventData.getBlock()).date

          return {
            timestamp: timestamp,
            data: contract.interface.decodeEventLog(event, eventData.data, eventData.topics)
          }
        })
        return Promise.all(result)
      } catch (error) {
        const { show } = useToastStore()
        show(ToastType.Error, 'Failed to fetch events')
      }
    }
  }
})
