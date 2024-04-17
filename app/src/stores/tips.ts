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
    totalTipAmount: 0 as number
  }),
  actions: {
    async connectWallet() {
      if (this.isWalletConnected) return

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
        await contract!.pushTip(addresses, {
          value: ethers.parseEther(this.totalTipAmount.toString())
        })
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
        await contract!.sendTip(addresses, {
          value: ethers.parseEther(this.totalTipAmount.toString())
        })
        show(ToastType.Success, 'Tip sent successfully')
      } catch (error) {
        show(ToastType.Error, 'Failed to send tip')
      } finally {
        this.sendTipLoading = false
        this.totalTipAmount = 0
      }
    },
    async getEvents(event: TipsEventType) {
      if (!this.isWalletConnected) await this.connectWallet()

      try {
        const filter = {
          address: TIPS_ADDRESS,
          topics: [
            ethers.id('SendTip(address,address[],uint256,uint256)'),
            ethers.id('PushTip(address,address[],uint256,uint256)')
          ]
        }
        let events = await provider.getLogs(filter)
        console.log(await contract.queryFilter(event))

        console.log(events)

        const result = events.map(async (eventData: EventLog | Log) => {
          const timestamp = (await eventData.getBlock()).date

          return {
            timestamp: timestamp,
            data: contract.interface.decodeEventLog(event, eventData.data, eventData.topics)
          }
        })
        return Promise.all(result)
      } catch (error) {
        console.log(error)

        const { show } = useToastStore()
        show(ToastType.Error, 'Failed to fetch events')
      }
    }
  }
})
