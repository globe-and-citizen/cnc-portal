import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import BANK_ABI from '../artifacts/abi/bank.json'
import type { Contract } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'

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
    // TODO: change to actual deploy contract
    const bankAddress = '0x5466767aA6412f298dD61FbE4E3e40483030b39B'
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
}
