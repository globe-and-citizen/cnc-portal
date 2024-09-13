import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import { TIPS_ADDRESS } from '@/constant'
import type { ContractTransaction } from 'ethers'
import ABI from '../artifacts/abi/tips.json'
import type { TipsEventType } from '@/types'
import type { EventLog } from 'ethers'
import type { Log } from 'ethers'
import { BankService, type IBankService } from './bankService'
import { SmartContract } from './contractService'
import type { InterfaceAbi } from 'ethers'
import type { TransactionResponse } from 'ethers'

export class TipsService extends SmartContract {
  bankService: IBankService
  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    super(TIPS_ADDRESS, ABI as InterfaceAbi, web3Library)
    this.bankService = new BankService()
  }

  async pushTip(
    addresses: string[],
    amount: number,
    bankAddress?: string
  ): Promise<TransactionResponse> {
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

  async sendTip(
    addresses: string[],
    amount: number,
    bankAddress?: string
  ): Promise<TransactionResponse> {
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

  async withdrawTips(): Promise<ContractTransaction> {
    if (!this.contract) {
      this.contract = await super.getContract()
    }

    const tx = await this.contract.withdraw()
    return await tx.wait()
  }

  async getEvents(type: TipsEventType): Promise<EventLog[] | Log[]> {
    return await super.getEvents(type)
  }

  async bankPushTip(
    bankAddress: string,
    addresses: string[],
    amount: number
  ): Promise<TransactionResponse> {
    const tx = await this.bankService.pushTip(bankAddress, addresses, amount)
    await tx.wait()

    return tx
  }
  async bankSendTip(
    bankAddress: string,
    addresses: string[],
    amount: number
  ): Promise<TransactionResponse> {
    const tx = await this.bankService.sendTip(bankAddress, addresses, amount)
    await tx.wait()

    return tx
  }
}
