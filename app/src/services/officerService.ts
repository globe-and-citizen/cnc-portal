import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import OFFICER_ABI from '@/artifacts/abi/officer.json'
import FACTORY_BEACON_ABI from '../artifacts/abi/factory-beacon.json'
import { useUserDataStore } from '@/stores/user'
import {
  BANK_BEACON_ADDRESS,
  BOD_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_BEACON_ADDRESS,
  OFFICER_ADDRESS,
  OFFICER_BEACON,
  VOTING_BEACON_ADDRESS
} from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { Contract, InterfaceAbi } from 'ethers'
import { SmartContract } from './contractService'

export interface IOfficerService {
  web3Library: IWeb3Library

  createOfficerContract(teamId: string): Promise<string>

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
    const officerImplementation = await this.getContract(OFFICER_ADDRESS, OFFICER_ABI)

    const bodProxyFactory = await this.getContract(OFFICER_BEACON, FACTORY_BEACON_ABI)
    const tx = await bodProxyFactory.createBeaconProxy(
      officerImplementation.interface.encodeFunctionData('initialize', [
        useUserDataStore().address,
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
  }
  private async getContract(address: string, abi: InterfaceAbi): Promise<Contract> {
    return await new SmartContract(address, abi).getContract()
  }
  private async getOfficerContract(officerAddress: string): Promise<Contract> {
    const bodContract = await this.web3Library.getContract(officerAddress, OFFICER_ABI)

    return bodContract
  }
}
