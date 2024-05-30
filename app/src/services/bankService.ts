import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import { FetchTeamAPI, type TeamAPI } from '@/apis/teamApi'
import BANK_ABI from '../artifacts/abi/bank.json'
import type { Contract } from 'ethers'

export interface IBankService {
  web3Library: IWeb3Library
  teamApi: TeamAPI
  createBankContract(id: string): Promise<string>
  deposit(bankAddress: string, amount: string): Promise<any>
  pushTip(bankAddress: string, addresses: string[], amount: number): Promise<any>
  sendTip(bankAddress: string, addresses: string[], amount: number): Promise<any>
}

export class BankService implements IBankService {
  web3Library: IWeb3Library
  teamApi: TeamAPI

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
    this.teamApi = new FetchTeamAPI()
  }

  async createBankContract(teamId: string): Promise<string> {
    // TODO: change to actual deploy contract
    const bankAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'

    const response = await this.teamApi.updateTeam(teamId, {
      bankAddress
    })

    return response.bankAddress!
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
    try {
      const bankContract = await this.web3Library.getContract(bankAddress, BANK_ABI)

      return bankContract
    } catch (error) {
      throw error
    }
  }
}
