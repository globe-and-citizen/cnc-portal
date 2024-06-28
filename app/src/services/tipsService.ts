import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import { TIPS_ADDRESS } from '@/constant'
import ABI from '../artifacts/abi/tips.json'
import type { TipsEventType } from '@/types'
import type { EventLog } from 'ethers'
import type { Log } from 'ethers'
import { BankService, type IBankService } from './bankService'
import { SmartContract } from './contractService'

export class TipsService extends SmartContract {
  bankService: IBankService
  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    super(TIPS_ADDRESS, ABI, web3Library)
    this.bankService = new BankService()
  }

  async pushTip(addresses: string[], amount: number, bankAddress?: string): Promise<any> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    if (bankAddress) {
      return await this.bankPushTip(bankAddress, addresses, amount)
    }

    const tx = await this.contract.pushTip(addresses, {
      value: this.web3Library.parseEther(amount.toString())
    })

    await tx.wait()

    return tx
  }

  async sendTip(addresses: string[], amount: number, bankAddress?: string): Promise<void> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    if (bankAddress) {
      return await this.bankSendTip(bankAddress, addresses, amount)
    }

    const tx = await this.contract.sendTip(addresses, {
      value: this.web3Library.parseEther(amount.toString())
    })
    await tx.wait()

    return tx
  }

  async getBalance(): Promise<bigint> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    return await this.contract.getBalance(await this.web3Library.getAddress())
  }

  async withdrawTips(): Promise<void> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    const tx = await this.contract.withdraw()
    await tx.wait()
  }

  async getEvents(type: TipsEventType): Promise<EventLog[] | Log[]> {
    return await super.getEvents(type)
  }

  async bankPushTip(bankAddress: string, addresses: string[], amount: number): Promise<any> {
    try {
      const tx = await this.bankService.pushTip(bankAddress, addresses, amount)
      await tx.wait()

      return tx
    } catch (error) {
      throw error
    }
  }
  async bankSendTip(bankAddress: string, addresses: string[], amount: number): Promise<any> {
    const tx = await this.bankService.sendTip(bankAddress, addresses, amount)
    await tx.wait()

    return tx
  }
}
