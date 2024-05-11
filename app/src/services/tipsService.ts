import { type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import { TIPS_ADDRESS } from '@/constant'
import type { AddressLike } from 'ethers'
import ABI from '../abi/tips.json'
import type { TipsEventType } from '@/types'
import type { EventLog } from 'ethers'
import type { Contract } from 'ethers'
import type { Log } from 'ethers'

interface ISmartContract {
  contract: Contract | undefined
  contractAddress: string
  contractAbi: any
  getContract(address: string, abi: any): Promise<Contract>
}

export class SmartContract implements ISmartContract {
  contract: Contract | undefined
  contractAddress: string
  contractAbi: any
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library, contractAddress: string, contractAbi: any) {
    this.web3Library = web3Library
    this.contractAddress = contractAddress
    this.contractAbi = contractAbi
  }

  async getContract(): Promise<Contract> {
    if (!this.contract) {
      this.contract = await this.web3Library.getContract(this.contractAddress, this.contractAbi)
    }

    return this.contract
  }
}

export class TipsService extends SmartContract {
  constructor(web3Library: IWeb3Library) {
    super(web3Library, TIPS_ADDRESS, ABI)
  }

  async pushTip(addresses: AddressLike[], amount: number): Promise<any> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    const tx = await this.contract.pushTip(addresses, {
      value: this.web3Library.parseEther(amount.toString())
    })

    await tx.wait()

    return tx
  }

  async sendTip(addresses: AddressLike[], amount: number): Promise<void> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    const tx = await this.contract.sendTip(addresses, {
      value: this.web3Library.parseEther(amount.toString())
    })
    await tx.wait()

    return tx
  }

  async getBalance(): Promise<string> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    return (await this.contract.getBalance(await this.web3Library.getAddress())).toString()
  }

  async withdrawTips(): Promise<void> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    const tx = await this.contract.withdraw()
    await tx.wait()
  }

  async getEvents(type: TipsEventType): Promise<EventLog[] | Log[]> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    return this.contract.queryFilter(type)
  }
}
