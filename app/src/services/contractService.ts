import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import type { Log } from 'ethers'
import type { EventLog } from 'ethers'
import type { Contract } from 'ethers'

interface ISmartContract {
  contract: Contract | undefined
  contractAddress: string
  contractAbi: any
  getContract(address: string, abi: any): Promise<Contract>
  getEvents(type: string): Promise<EventLog[] | Log[]>
}

export class SmartContract implements ISmartContract {
  contract: Contract | undefined
  contractAddress: string
  contractAbi: any
  web3Library: IWeb3Library

  constructor(
    contractAddress: string,
    contractAbi: any,
    web3Library: IWeb3Library = EthersJsAdapter.getInstance()
  ) {
    this.contractAddress = contractAddress
    this.contractAbi = contractAbi
    this.web3Library = web3Library
  }

  async getContract(): Promise<Contract> {
    if (!this.contract) {
      this.contract = await this.web3Library.getContract(this.contractAddress, this.contractAbi)
    }

    return this.contract
  }

  async getEvents(type: string): Promise<EventLog[] | Log[]> {
    if (!this.contract) {
      this.contract = await this.web3Library.getContract(this.contractAddress, this.contractAbi)
    }

    return this.contract.queryFilter(type)
  }
}
