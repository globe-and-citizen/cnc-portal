import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'

import { BOD_ABI } from '@/artifacts/abi/bod'
import type { Contract } from 'ethers'
import { SmartContract } from './contractService'

export interface IBoDService {
  web3Library: IWeb3Library

  getBoardOfDirectors(bodAddress: string): Promise<string[]>
}
export class BoDService implements IBoDService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }
  async getBoardOfDirectors(bodAddress: string): Promise<string[]> {
    const bodContract = await this.getBoDContract(bodAddress)
    const boardOfDirectors = await bodContract.getBoardOfDirectors()
    return boardOfDirectors
  }

  async getContract(bodAddress: string): Promise<Contract> {
    const contractService = this.getContractService(bodAddress)

    return await contractService.getContract()
  }
  private getContractService(bodAddress: string): SmartContract {
    return new SmartContract(bodAddress, BOD_ABI)
  }
  private async getBoDContract(bodAddress: string): Promise<Contract> {
    const bodContract = await this.web3Library.getContract(bodAddress, BOD_ABI)

    return bodContract
  }
}
