import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import EXPENSE_ACCOUNT_LOGIC_ABI from '../artifacts/abi/expense-account.json'

import { SmartContract } from './contractService'
import type { Contract, InterfaceAbi } from 'ethers'
export interface IExpenseAccountService {
  web3Library: IWeb3Library
}

export class ExpenseAccountService implements IExpenseAccountService {
  web3Library: IWeb3Library
  abi: InterfaceAbi = EXPENSE_ACCOUNT_LOGIC_ABI

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async getContract(address: string, abi = this.abi): Promise<Contract> {
    return await new SmartContract(address, abi).getContract()
  }
}
