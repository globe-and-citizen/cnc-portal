import { ethers } from 'ethers'
import { defineStore } from 'pinia'
import { TIPS_ADDRESS } from '@/constant'
import ABI from '../abi/tips.json'

export const useTipsStore = defineStore('tips', {
  state: () => ({
    provider: null as ethers.BrowserProvider | null,
    contract: null as ethers.Contract | null,
    signer: null as ethers.Signer | null,
    sendTipLoading: false as boolean,
    pushTipLoading: false as boolean,
    isWalletConnected: false as boolean
  }),
  actions: {
    async connectWallet() {
      if (!this.isWalletConnected) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum)
          this.provider = provider
          await provider.send('eth_requestAccounts', [])
          this.signer = await provider.getSigner()
          this.contract = new ethers.Contract(TIPS_ADDRESS, ABI, await provider.getSigner())
          this.isWalletConnected = true
        } catch (error) {
          throw error
        }
      }
    },
    async pushTip(addresses: ethers.AddressLike[], totalAmount: number) {
      if (!this.isWalletConnected) await this.connectWallet()

      this.pushTipLoading = true

      try {
        await this.contract!.pushTip(addresses, {
          value: ethers.parseEther(totalAmount.toString())
        })
      } catch (error) {
        throw error
      }
      this.pushTipLoading = false
    },
    async sendTip(addresses: ethers.AddressLike[], totalAmount: number) {
      if (!this.isWalletConnected) await this.connectWallet()

      this.sendTipLoading = true

      try {
        await this.contract!.sendTip(addresses, {
          value: ethers.parseEther(totalAmount.toString())
        })
      } catch (error) {
        throw error
      }

      this.sendTipLoading = false
    }
  }
})
