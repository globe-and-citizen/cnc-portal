import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import BANK_ABI from '../artifacts/abi/bank.json'
import PROXY_ABI from '../artifacts/abi/proxy.json'
import type { Contract } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { BANK_IMPL_ADDRESS } from '@/constant'
import { PROXY_BYTECODE } from '@/artifacts/bytecode/proxy'
import type { BankEventType } from '@/types'
import type { EventLog } from 'ethers'
import type { Log } from 'ethers'
import { SmartContract } from './contractService'
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
  private contractService?: SmartContract

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
    if (!this.contractService) {
      this.contractService = this.getContractService("0x5466767aA6412f298dD61FbE4E3e40483030b39B")
    }

    return await this.contractService.getEvents(type)
  }

  async getContract(bankAddress: string): Promise<Contract> {
    if (!this.contractService) {
      this.contractService = this.getContractService(bankAddress)
    }

    return await this.contractService.getContract()
  }

  private getContractService(bankAddress: string): SmartContract {
    return new SmartContract(bankAddress, BANK_ABI)
  }

  private async deployBankContract(): Promise<string> {
    const proxyFactory = await this.web3Library.getFactoryContract(PROXY_ABI, PROXY_BYTECODE)
    const proxyDeployment = await proxyFactory.deploy(
      BANK_IMPL_ADDRESS,
      await this.web3Library.getAddress(),
      '0x'
    )
    const proxy = await proxyDeployment.waitForDeployment()
    await proxyDeployment.waitForDeployment()

    return await proxy.getAddress()
  }
}
