import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import BOD_ABI from '@/artifacts/abi/bod.json'
import { type Contract } from 'ethers'
import { SmartContract } from './contractService'
import type { Action } from '@/types'

export interface IBoDService {
  web3Library: IWeb3Library

  getBoardOfDirectors(bodAddress: string): Promise<string[]>
  getActionCount(bodAddress: string): Promise<number>
  addAction(bodAddress: string, action: Partial<Action>): Promise<void>
  approve(actionId: number, bodAddress: string): Promise<void>
  revoke(actionId: number, bodAddress: string): Promise<void>
  isApproved(actionId: number, address: string, bodAddress: string): Promise<boolean>
  isExecuted(actionId: number, bodAddress: string): Promise<boolean>
  getApprovalCount(actionId: number, bodAddress: string): Promise<number>
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

  async getActionCount(bodAddress: string): Promise<number> {
    const bodContract = await this.getBoDContract(bodAddress)
    const actionCount = await bodContract.actionCount()

    return actionCount
  }

  async addAction(bodAddress: string, action: Partial<Action>): Promise<void> {
    const bodContract = await this.getBoDContract(bodAddress)
    const tx = await bodContract.addAction(action.targetAddress, action.description, action.data)

    await tx.wait()
  }

  async approve(actionId: number, bodAddress: string): Promise<void> {
    const bodContract = await this.getBoDContract(bodAddress)
    const tx = await bodContract.approve(actionId)

    await tx.wait()
  }

  async isExecuted(actionId: number, bodAddress: string): Promise<boolean> {
    const bodContract = await this.getBoDContract(bodAddress)
    const executed = await bodContract.isActionExecuted(actionId)

    return executed
  }

  async revoke(actionId: number, bodAddress: string): Promise<void> {
    const bodContract = await this.getBoDContract(bodAddress)
    const tx = await bodContract.revoke(actionId)

    await tx.wait()
  }

  async isApproved(actionId: number, bodAddress: string, address: string): Promise<boolean> {
    const bodContract = await this.getBoDContract(bodAddress)
    const approvers = await bodContract.isApproved(actionId, address)

    return approvers
  }

  async getApprovalCount(actionId: number, bodAddress: string): Promise<number> {
    const bodContract = await this.getBoDContract(bodAddress)
    const approvalCount = await bodContract.approvalCount(actionId)

    return approvalCount
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
