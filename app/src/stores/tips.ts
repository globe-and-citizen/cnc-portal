import { ethers } from 'ethers'
import { defineStore } from 'pinia'
import { TIPS_ADDRESS } from '@/constant'
import ABI from '../abi/tips.json'
import { ToastType, TipsEventType } from '@/types'
import { useToastStore } from './toast'
import type { AddressLike } from 'ethers'
import type { EventLog } from 'ethers'
import type { Log } from 'ethers'
import dayjs from 'dayjs'
import type { Ref } from 'vue'

let contract: ethers.Contract
let provider: ethers.BrowserProvider

export const useTipsStore = defineStore('tips', {
  state: () => ({
    contract: null as ethers.Contract | null,
    sendTipLoading: false as boolean,
    pushTipLoading: false as boolean,
    isWalletConnected: false as boolean,
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
      if (provider) {
        const network = await provider.getNetwork()
        if (network.name.toString() != import.meta.env.VITE_CURRENT_NETWORK_NAME) {
          show(
            ToastType.Warning,
            `Please make sure you're connected to the ${import.meta.env.VITE_CURRENT_NETWORK_NAME} network. You're currently connected to the ${network.name} network.`
          )

          return
        }
      }
      await provider.send('eth_requestAccounts', [])
      contract = new ethers.Contract(TIPS_ADDRESS, ABI, await provider.getSigner())
      this.isWalletConnected = true
    },
    async pushTip(addresses: AddressLike[], amount: number) {
      const { show } = useToastStore()

      if (!this.isWalletConnected) await this.connectWallet()

      this.pushTipLoading = true

      try {
        const tx = await contract.pushTip(addresses, {
          value: ethers.parseEther(amount.toString())
        })
        await tx.wait()

        show(ToastType.Success, 'Tip pushed successfully')
      } catch (error: any) {
        show(ToastType.Error, error.reason ? error.reason : 'Failed to push tip')
      } finally {
        this.pushTipLoading = false
      }
    },
    async sendTip(addresses: AddressLike[], amount: number) {
      const { show } = useToastStore()

      if (!this.isWalletConnected) await this.connectWallet()

      this.sendTipLoading = true

      try {
        const tx = await contract.sendTip(addresses, {
          value: ethers.parseEther(amount.toString())
        })
        await tx.wait()
        await this.getBalance()

        show(ToastType.Success, 'Tip sent successfully')
      } catch (error: any) {
        show(ToastType.Error, error.reason ? error.reason : 'Failed to send tip')
      } finally {
        this.sendTipLoading = false
      }
    },
    async getBalance() {
      if (!this.isWalletConnected) await this.connectWallet()
      const address = (await provider.getSigner()).address

      this.balance = ethers.formatEther(await contract!.getBalance(address))
    },
    async withdrawTips() {
      if (!this.isWalletConnected) await this.connectWallet()

      const { show } = useToastStore()

      try {
        const tx = await contract.withdraw()
        await tx.wait()

        await this.getBalance()
        show(ToastType.Success, 'Tips withdrawn successfully')
      } catch (error: any) {
        show(ToastType.Error, error.reason ? error.reason : 'Failed to withdraw tips')
      }
    },
    async getEvents(event: TipsEventType, loading: Ref<boolean>) {
      if (!this.isWalletConnected) await this.connectWallet()

      try {
        loading.value = true
        const events = await contract.queryFilter(event)

        const result = await Promise.all(
          events.map(async (eventData: EventLog | Log) => {
            const date = dayjs((await eventData.getBlock()).date).format('DD/MM/YYYY HH:mm')

            return {
              txHash: eventData.transactionHash,
              date: date,
              data: contract.interface.decodeEventLog(event, eventData.data, eventData.topics)
            }
          })
        )

        return result
      } catch (error) {
        const { show } = useToastStore()
        show(ToastType.Error, 'Failed to fetch events')
      } finally {
        loading.value = false
      }
    }
  }
})
