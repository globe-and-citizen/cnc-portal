import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import OFFICER_ABI from '@/artifacts/abi/officer.json'
import BEACON_PROXY_ABI from '@/artifacts/abi/beacon-proxy.json'
import { BEACON_PROXY_BYTECODE } from '@/artifacts/bytecode/beacon-proxy'
import { BOD_BEACON_ADDRESS, OFFICER_BEACON, TIPS_ADDRESS, VOTING_BEACON_ADDRESS } from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { Contract } from 'ethers'

export interface IOfficerService {
  web3Library: IWeb3Library

  createOfficerContract(teamId: string): Promise<string>
  getOfficerTeam(
    officerAddress: string
  ): Promise<{ founders: string[]; members: string[]; bankAddress: string; votingAddress: string }>
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
  }> {
    const officerContract = await this.getOfficerContract(officerAddress)
    const team = await officerContract.getTeam()
    return {
      founders: team[0] as string[],
      members: team[1] as string[],
      bankAddress: team[2] as string,
      votingAddress: team[3] as string
    }
  }

  async deployBank(officerAddress: string): Promise<void> {
    const officerContract = await this.getOfficerContract(officerAddress)
    const tx = await officerContract.deployBankAccount(TIPS_ADDRESS)

    const bankAddress = await tx.wait()
    console.log('Bank Address:', bankAddress)
  }

  async deployVoting(officerAddress: string): Promise<void> {
    const officerContract = await this.getOfficerContract(officerAddress)
    const tx = await officerContract.deployVotingContract()
    await tx.wait()

    return tx
  }
  async createTeam(officerAddress: string, founders: string[], members: string[]): Promise<string> {
    const officerContract = await this.getOfficerContract(officerAddress)
    const tx = await officerContract.createTeam(founders, members)
    return await tx.wait()
  }

  private async deployOfficerContract(): Promise<string> {
    const officerImplementation = await this.web3Library.getContract(OFFICER_BEACON, OFFICER_ABI)

    const bodProxyFactory = await this.web3Library.getFactoryContract(
      BEACON_PROXY_ABI,
      BEACON_PROXY_BYTECODE
    )
    const beaconProxyDeployment = await bodProxyFactory.deploy(
      OFFICER_BEACON,
      officerImplementation.interface.encodeFunctionData('initialize', [
        BOD_BEACON_ADDRESS,
        VOTING_BEACON_ADDRESS
      ])
    )
    const beaconProxy = await beaconProxyDeployment.waitForDeployment()
    await beaconProxyDeployment.waitForDeployment()

    return await beaconProxy.getAddress()
  }

  private async getOfficerContract(officerAddress: string): Promise<Contract> {
    const bodContract = await this.web3Library.getContract(officerAddress, OFFICER_ABI)

    return bodContract
  }
}
