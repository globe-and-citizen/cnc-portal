import { type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import { TIPS_ADDRESS } from '@/constant'
import type { AddressLike } from 'ethers'
import ABI from '../abi/tips.json'
import type { TipsEventType } from '@/types'
import type { EventLog } from 'ethers'

interface ISmartContract {
  contract: any
  contractAddress: string
  contractAbi: any
  getContract(address: string, abi: any): Promise<any>
}

export class SmartContract implements ISmartContract {
  contract: any
  contractAddress: string
  contractAbi: any
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library, contractAddress: string, contractAbi: any) {
    this.web3Library = web3Library
    this.contractAddress = contractAddress
    this.contractAbi = contractAbi
  }

  async getContract(): Promise<any> {
    if (!this.contract) {
      this.contract = await this.web3Library.getContract(this.contractAddress, this.contractAbi)
    }

    return this.contract
  }
}

export class TipsService extends SmartContract implements ISmartContract {
  constructor(web3Library: IWeb3Library) {
    super(web3Library, TIPS_ADDRESS, ABI)
  }

  async pushTip(addresses: AddressLike[], amount: number): Promise<any> {
    try {
      if (!this.contract) {
        this.contract = await super.getContract()
      }

      const tx = await this.contract.pushTip(addresses, {
        value: this.web3Library.parseEther(amount.toString())
      })
      
      await tx.wait()

      return tx
    } catch (error) {
      throw error
    }
  }

  async sendTip(addresses: AddressLike[], amount: number): Promise<void> {
    try {
      if (!this.contract) {
        this.contract = await super.getContract()
      }

      const tx = await this.contract.sendTip(addresses, {
        value: this.web3Library.parseEther(amount.toString())
      })
      await tx.wait()

      return tx
    } catch (error) {
      throw error
    }
  }

  async getBalance(): Promise<string> {
    try {
      if (!this.contract) {
        this.contract = await super.getContract()
      }

      return (await this.contract.getBalance(await this.web3Library.getAddress())).toString()
    } catch (error) {
      throw error
    }
  }

  async withdrawTips(): Promise<void> {
    try {
      if (!this.contract) {
        this.contract = await super.getContract()
      }

      const tx = await this.contract.withdraw()
      await tx.wait()
    } catch (error) {
      throw error
    }
  }

  async getEvents(type: TipsEventType): Promise<EventLog[]> {
    try {
      if (!this.contract) {
        this.contract = await super.getContract()
      }

      return this.contract.queryFilter(type)
    } catch (error) {
      throw error
    }
  }
}
