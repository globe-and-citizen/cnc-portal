import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import { TIPS_ADDRESS } from '@/constant'
import type { ContractTransaction } from 'ethers'
import ABI from '../artifacts/abi/tips.json'
import { BankService, type IBankService } from './bankService'
import { SmartContract } from './contractService'
import type { InterfaceAbi } from 'ethers'

export class TipsService extends SmartContract {
  bankService: IBankService
  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    super(TIPS_ADDRESS, ABI as InterfaceAbi, web3Library)
    this.bankService = new BankService()
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
}
