import { ethers } from 'ethers'
import { defineStore } from 'pinia'
import { JSON_RPC_URL, PRIVATE_KEY, TIPS_ADDRESS } from '@/constant'
import ABI from '../abi/tips.json'

const provider = new ethers.JsonRpcProvider(JSON_RPC_URL)
const signer = new ethers.Wallet(PRIVATE_KEY, provider)
const contract = new ethers.Contract(TIPS_ADDRESS, ABI, signer)

export const useTipsStore = defineStore('tips', {
  state: () => ({
    contract: contract as ethers.Contract,
    signer: signer as ethers.Signer,
    sendTipLoading: false as boolean,
    pushTipLoading: false as boolean,

  }),
  actions: {
    async pushTip(addresses: ethers.AddressLike[], totalAmount: number) {
      this.pushTipLoading = true

      try {
        await this.contract.pushTip(addresses, {
          value: ethers.parseEther(totalAmount.toString())
        })
        
      } catch (error) {
        throw error
      }
      this.pushTipLoading = false
    },
    async sendTip(addresses: ethers.AddressLike[], totalAmount: number) {
      this.sendTipLoading = true
      
      try {
        await this.contract.sendTip(addresses, {
          value: ethers.parseEther(totalAmount.toString())
        })
      } catch (error) {
        throw error
      }

      this.sendTipLoading = false
    }
  },
  getters: {
    provider() {
      return provider;
    }
  }
})
