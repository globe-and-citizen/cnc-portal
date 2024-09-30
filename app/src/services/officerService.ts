import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import OFFICER_ABI from '@/artifacts/abi/officer.json'
import BEACON_PROXY_ABI from '@/artifacts/abi/beacon-proxy.json'
import FACTORY_BEACON_ABI from '../artifacts/abi/factory-beacon.json'
import {
  BANK_BEACON_ADDRESS,
  BOD_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_BEACON_ADDRESS,
  OFFICER_ADDRESS,
  OFFICER_BEACON,
  TIPS_ADDRESS,
  VOTING_BEACON_ADDRESS
} from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { Contract, ContractInterface, InterfaceAbi } from 'ethers'
import { SmartContract } from './contractService'

export interface IOfficerService {
  web3Library: IWeb3Library

  createOfficerContract(teamId: string): Promise<string>
  getOfficerTeam(officerAddress: string): Promise<{
    founders: string[]
    members: string[]
    bankAddress: string
    votingAddress: string
    bodAddress: string
    expenseAccountAddress: string
  }>
  deployBank(officerAddress: string): Promise<void>
  deployVoting(officerAddress: string): Promise<void>
  createTeam(officerAddress: string, founders: string[], members: string[]): Promise<string>
}

export class OfficerService implements IOfficerService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async createOfficerContract(teamId: string): Promise<string> {
    const officerAddress = await this.deployOfficerContract()
    const response = await useCustomFetch<string>(`teams/${teamId}`).put({ officerAddress }).json()

    return response.data.value.officerAddress
  }

  async getOfficerTeam(officerAddress: string): Promise<{
    founders: string[]
    members: string[]
    bankAddress: string
    votingAddress: string
    bodAddress: string
    expenseAccountAddress: string
  }> {
    const officerContract = await this.getOfficerContract(officerAddress)
    const team = await officerContract.getTeam()
    return {
      founders: team[0] as string[],
      members: team[1] as string[],
      bankAddress: team[2] as string,
      votingAddress: team[3] as string,
      bodAddress: team[4] as string,
      expenseAccountAddress: team[5] as string
    }
  }

  async deployBank(officerAddress: string): Promise<void> {
    const officerContract = await this.getOfficerContract(officerAddress)
    const tx = await officerContract.deployBankAccount(TIPS_ADDRESS)

    await tx.wait()
  }

  async deployVoting(officerAddress: string): Promise<void> {
    const officerContract = await this.getOfficerContract(officerAddress)
    const tx = await officerContract.deployVotingContract()
    await tx.wait()

    return tx
  }
  async deployExpenseAccount(officerAddress: string): Promise<void> {
    const officerContract = await this.getOfficerContract(officerAddress)
    const tx = await officerContract.deployExpenseAccount()
    await tx.wait()

    return tx
  }

  async createTeam(officerAddress: string, founders: string[], members: string[]): Promise<string> {
    const officerContract = await this.getOfficerContract(officerAddress)
    const tx = await officerContract.createTeam(founders, members)
    return await tx.wait()
  }

  private async deployOfficerContract(): Promise<string> {
    try {
      const officerImplementation = await this.getContract(OFFICER_ADDRESS, OFFICER_ABI)

      const bodProxyFactory = await this.getContract(OFFICER_BEACON, FACTORY_BEACON_ABI)
      const tx = await bodProxyFactory.createBeaconProxy(
        officerImplementation.interface.encodeFunctionData('initialize', [
          BANK_BEACON_ADDRESS,
          VOTING_BEACON_ADDRESS,
          BOD_BEACON_ADDRESS,
          EXPENSE_ACCOUNT_BEACON_ADDRESS
        ])
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
    } catch (error) {
      console.log(error)
    }
  }
  private async getContract(address: string, abi: InterfaceAbi): Promise<Contract> {
    return await new SmartContract(address, abi).getContract()
  }
  private async getOfficerContract(officerAddress: string): Promise<Contract> {
    const bodContract = await this.web3Library.getContract(officerAddress, OFFICER_ABI)

    return bodContract
  }
}
