import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import type { InterfaceAbi } from 'ethers'
import type { Contract } from 'ethers'

interface ISmartContract {
  contract: Contract | undefined
  contractAddress: string
  contractAbi: InterfaceAbi
  getContract(address: string, abi: InterfaceAbi): Promise<Contract>
}

export class SmartContract implements ISmartContract {
  contract: Contract | undefined
  contractAddress: string
  contractAbi: InterfaceAbi
  web3Library: IWeb3Library

  constructor(
    contractAddress: string,
    contractAbi: InterfaceAbi,
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
}
