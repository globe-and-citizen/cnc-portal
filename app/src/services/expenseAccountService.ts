import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import EXPENSE_ACCOUNT_LOGIC_ABI from '../artifacts/abi/expense-account.json'
import FACTORY_BEACON_ABI from '../artifacts/abi/factory-beacon.json'
import { useUserDataStore } from '@/stores/user'
import { EXPENSE_ACCOUNT_BEACON_ADDRESS, EXPENSE_ACCOUNT_LOGIC_ADDRESS } from '@/constant'
import { SmartContract } from './contractService'
import type { Contract, InterfaceAbi, TransactionResponse } from 'ethers'
export interface IExpenseAccountService {
  web3Library: IWeb3Library
  createExpenseAccountContract(id: string): Promise<string>
}

export class ExpenseAccountService implements IExpenseAccountService {
  web3Library: IWeb3Library
  abi: InterfaceAbi = EXPENSE_ACCOUNT_LOGIC_ABI

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async createExpenseAccountContract(): Promise<string> {
    return await this.deployExpenseAccountContract()
  }

  async getFunctionSignature(
    expenseAccountAddresss: string,
    functionName: string,
    args: unknown[]
  ): Promise<string> {
    const expenseAccount = await this.getContract(expenseAccountAddresss)
    args.map((arg) => {
      if (typeof arg === 'number') {
        this.web3Library.parseEther(arg.toString())
      }
    })
    const functionSignature = expenseAccount.interface.encodeFunctionData(functionName, args)

    return functionSignature
  }

  async transferOwnership(
    expenseAccountAddress: string,
    newOwner: string
  ): Promise<TransactionResponse> {
    const expenseAccount = await this.getContract(expenseAccountAddress)
    const tx = await expenseAccount.transferOwnership(newOwner)
    await tx.wait()

    return tx
  }

  async getMaxLimit(expenseAccountAddress: string): Promise<string> {
    const expenseAccount = await this.getContract(expenseAccountAddress, EXPENSE_ACCOUNT_LOGIC_ABI)
    let maxLimit = await expenseAccount.maxLimit()
    maxLimit = this.web3Library.formatEther(maxLimit)
    return maxLimit
  }

  async approveAddress(expenseAccountAddress: string, userAddress: string): Promise<unknown> {
    const expenseAccount = await this.getContract(expenseAccountAddress, EXPENSE_ACCOUNT_LOGIC_ABI)
    const tx = await expenseAccount.approveAddress(userAddress)
    await tx.wait()
    return tx
  }

  async disapproveAddress(expenseAccountAddress: string, userAddress: string): Promise<unknown> {
    const expenseAccount = await this.getContract(expenseAccountAddress, EXPENSE_ACCOUNT_LOGIC_ABI)
    const tx = await expenseAccount.disapproveAddress(userAddress)
    await tx.wait()
    return tx
  }

  async setMaxLimit(address: string, amount: string): Promise<unknown> {
    const expenseAccount = await this.getContract(address, EXPENSE_ACCOUNT_LOGIC_ABI)
    const tx = await expenseAccount.setMaxLimit(this.web3Library.parseEther(`${amount}`))
    await tx.wait()
    return tx
  }

  async isApprovedAddress(expenseAccountAddress: string, userAddress: string): Promise<boolean> {
    const expenseAccount = await this.getContract(expenseAccountAddress)
    const result = await expenseAccount.approvedAddresses(userAddress)
    return result
  }

  async transfer(
    expenseAccountAddress: string,
    toAddress: string,
    amount: number
  ): Promise<unknown> {
    const expenseAccount = await this.getContract(expenseAccountAddress)
    const tx = await expenseAccount.transfer(toAddress, this.web3Library.parseEther(`${amount}`))
    await tx.wait()
    return tx
  }

  async getContract(address: string, abi = this.abi): Promise<Contract> {
    return await new SmartContract(address, abi).getContract()
  }

  async getOwner(expenseAccountAddress: string): Promise<string> {
    const expenseAccount = await this.getContract(expenseAccountAddress)
    const ownerAddress = await expenseAccount.owner()
    return ownerAddress
  }

  async getBalance(expenseAccountAddress: string): Promise<string> {
    const expenseAccount = await this.getContract(expenseAccountAddress)
    let balance = await expenseAccount.getBalance()
    balance = this.web3Library.formatEther(balance)
    return balance
  }

  private async deployExpenseAccountContract(): Promise<string> {
    const expenseAccountLogic = await this.getContract(EXPENSE_ACCOUNT_LOGIC_ADDRESS, this.abi)

    const expenseAccountFactoryBeacon = await this.getContract(
      EXPENSE_ACCOUNT_BEACON_ADDRESS,
      FACTORY_BEACON_ABI
    )

    const tx = await expenseAccountFactoryBeacon.createBeaconProxy(
      expenseAccountLogic.interface.encodeFunctionData('initialize', [useUserDataStore().address])
    )

    const receipt = await tx.wait()

    let proxyAddress = ''
    if (receipt) {
      for (const log of receipt.logs) {
        if ('fragment' in log && log.fragment.name === 'BeaconProxyCreated') {
          proxyAddress = log.args[0]
        }
      }
    }

    return proxyAddress
  }
}
