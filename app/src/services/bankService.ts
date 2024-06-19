import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import BANK_ABI from '../artifacts/abi/bank.json'
import PROXY_ABI from '../artifacts/abi/proxy.json'
import type { Contract } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { BANK_IMPL_ADDRESS } from '@/constant'
import { PROXY_BYTECODE } from '@/artifacts/bytecode/proxy'

export interface IBankService {
  web3Library: IWeb3Library
  createBankContract(id: string): Promise<string>
  deposit(bankAddress: string, amount: string): Promise<any>
  pushTip(bankAddress: string, addresses: string[], amount: number): Promise<any>
  sendTip(bankAddress: string, addresses: string[], amount: number): Promise<any>
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
    const bank = await this.getBankContract(bankAddress)
    const tx = await bank.transfer(to, this.web3Library.parseEther(amount))
    await tx.wait()

    return tx
  }

  async pushTip(bankAddress: string, addresses: string[], amount: number): Promise<any> {
    const bank = await this.getBankContract(bankAddress)
    const tx = await bank.pushTip(addresses, this.web3Library.parseEther(amount.toString()))
    await tx.wait()

    return tx
  }

  async sendTip(bankAddress: string, addresses: string[], amount: number): Promise<any> {
    const bank = await this.getBankContract(bankAddress)
    const tx = await bank.sendTip(addresses, this.web3Library.parseEther(amount.toString()))
    await tx.wait()

    return tx
  }

  private async getBankContract(bankAddress: string): Promise<Contract> {
    const bankContract = await this.web3Library.getContract(bankAddress, BANK_ABI)

    return bankContract
  }

  private async deployBankContract(): Promise<string> {
    const proxyFactory = await this.web3Library.getFactoryContract(PROXY_ABI, PROXY_BYTECODE)
    const proxyDeployment = await proxyFactory.deploy(BANK_IMPL_ADDRESS, await this.web3Library.getAddress(), '0x')
    const proxy = await proxyDeployment.waitForDeployment()
    await proxyDeployment.waitForDeployment()

    return await proxy.getAddress()
  }
}
