import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import BANK_ABI from '../artifacts/abi/bank.json'
import BEACON_PROXY_ABI from '../artifacts/abi/beacon-proxy.json'
import type { Contract } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { BANK_IMPL_ADDRESS, BANK_BEACON_ADDRESS, TIPS_ADDRESS } from '@/constant'
import { BEACON_PROXY_BYTECODE } from '@/artifacts/bytecode/beacon-proxy'
import { BankEventType } from '@/types'
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
    const bankImplementation = await this.getContract(BANK_IMPL_ADDRESS)
    const beaconProxyFactory = await this.web3Library.getFactoryContract(
      BEACON_PROXY_ABI,
      BEACON_PROXY_BYTECODE
    )
    const beaconProxyDeployment = await beaconProxyFactory.deploy(
      BANK_BEACON_ADDRESS,
      bankImplementation.interface.encodeFunctionData('initialize', [TIPS_ADDRESS])
    )
    const beaconProxy = await beaconProxyDeployment.waitForDeployment()
    await beaconProxyDeployment.waitForDeployment()

    return await beaconProxy.getAddress()
  }
}
