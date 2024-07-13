import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import BANK_ABI from '../artifacts/abi/bank.json'
import PROXY_ABI from '../artifacts/abi/proxy.json'
import { type Contract } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { BANK_IMPL_ADDRESS, TIPS_ADDRESS } from '@/constant'
import { PROXY_BYTECODE } from '@/artifacts/bytecode/proxy'
import { BankEventType } from '@/types'
import type { EventLog } from 'ethers'
import type { Log } from 'ethers'
import { SmartContract } from './contractService'
import { BANK_BYTECODE } from '@/artifacts/bytecode/bank'

export interface IBankService {
  web3Library: IWeb3Library
  createBankContract(id: string): Promise<string>
  deposit(bankAddress: string, amount: string): Promise<any>
  pushTip(bankAddress: string, addresses: string[], amount: number): Promise<any>
  sendTip(bankAddress: string, addresses: string[], amount: number): Promise<any>
  getEvents(bankAddress: string, type: BankEventType): Promise<EventLog[] | Log[]>
}

export class BankService implements IBankService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async createBankContract(teamId: string): Promise<string> {
    const bankAddress = await this.deployBankContract()
    const response = await useCustomFetch<string>(`teams/${teamId}`).put({ bankAddress }).json()
    return response.data.value.bankAddress
  }

  async deposit(bankAddress: string, amount: string): Promise<any> {
    const tx = await this.web3Library.sendTransaction(bankAddress, amount)
    await tx.wait()

    return tx
  }

  async transfer(bankAddress: string, to: string, amount: string): Promise<any> {
    const bank = await this.getContract(bankAddress)
    const tx = await bank.transfer(to, this.web3Library.parseEther(amount))
    await tx.wait()

    return tx
  }

  async pushTip(bankAddress: string, addresses: string[], amount: number): Promise<any> {
    const bank = await this.getContract(bankAddress)
    const tx = await bank.pushTip(addresses, this.web3Library.parseEther(amount.toString()))
    await tx.wait()

    return tx
  }

  async sendTip(bankAddress: string, addresses: string[], amount: number): Promise<any> {
    const bank = await this.getContract(bankAddress)
    const tx = await bank.sendTip(addresses, this.web3Library.parseEther(amount.toString()))
    await tx.wait()

    return tx
  }

  async getEvents(bankAddress: string, type: BankEventType): Promise<EventLog[] | Log[]> {
    const contractService = this.getContractService(bankAddress)

    return await contractService.getEvents(type)
  }

  async getContract(bankAddress: string): Promise<Contract> {
    const contractService = this.getContractService(bankAddress)

    return await contractService.getContract()
  }

  private getContractService(bankAddress: string): SmartContract {
    return new SmartContract(bankAddress, BANK_ABI)
  }

  private async deployBankContract(): Promise<string> {
    const proxyFactory = await this.web3Library.getFactoryContract(PROXY_ABI, PROXY_BYTECODE)
    const bankFactory = await this.web3Library.getFactoryContract(BANK_ABI, BANK_BYTECODE)
    const proxyDeployment = await proxyFactory.deploy(
      BANK_IMPL_ADDRESS,
      await this.web3Library.getAddress(),
      bankFactory.interface.encodeFunctionData('initialize', [TIPS_ADDRESS])
    )
    const proxy = await proxyDeployment.waitForDeployment()

    return await proxy.getAddress()
  }
}
