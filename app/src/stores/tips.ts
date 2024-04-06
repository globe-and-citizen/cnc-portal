import { ethers } from 'ethers'
import { defineStore } from 'pinia'
import { TIPS_ADDRESS } from '@/constant'
import ABI from '../abi/tips.json'
import { ToastType } from '@/types'
import { useToastStore } from './toast'
import { useMembersStore } from './member'

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

      const provider = new ethers.BrowserProvider((window as any).ethereum)
      await provider.send('eth_requestAccounts', [])
      this.contract = new ethers.Contract(TIPS_ADDRESS, ABI, await provider.getSigner())
      this.isWalletConnected = true
    },
    async pushTip() {
      const { show } = useToastStore()
      const { members } = useMembersStore()
      const addresses = members.map((member) => member.address)

      if (this.totalTipAmount === 0) {
        show(ToastType.Info, 'Please enter amount to tip')
        return
      }

      if (!this.isWalletConnected) await this.connectWallet()

      this.pushTipLoading = true

      try {
        await this.contract!.pushTip(addresses, {
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
    async sendTip() {
      const { members } = useMembersStore()
      const addresses = members.map((member) => member.address)
      const { show } = useToastStore()
      if (this.totalTipAmount === 0) {
        show(ToastType.Info, 'Please enter amount to tip')
      }

      if (!this.isWalletConnected) await this.connectWallet()

      this.sendTipLoading = true

      try {
        await this.contract!.sendTip(addresses, {
          value: ethers.parseEther(this.totalTipAmount.toString())
        })
        show(ToastType.Success, 'Tip sent successfully')
      } catch (error) {
        show(ToastType.Error, 'Failed to send tip')
      } finally {
        this.sendTipLoading = false
        this.totalTipAmount = 0
      }
    }
  }
})
