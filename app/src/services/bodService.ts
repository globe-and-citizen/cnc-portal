import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import BOD_ABI from '@/artifacts/abi/bod.json'
import { type Contract } from 'ethers'
import { SmartContract } from './contractService'
import type { Action } from '@/types'

export interface IBoDService {
  web3Library: IWeb3Library

  addAction(bodAddress: string, action: Partial<Action>): Promise<void>
}
export class BoDService implements IBoDService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async addAction(bodAddress: string, action: Partial<Action>): Promise<void> {
    const bodContract = await this.getBoDContract(bodAddress)
    const tx = await bodContract.addAction(action.targetAddress, action.description, action.data)

    await tx.wait()
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
