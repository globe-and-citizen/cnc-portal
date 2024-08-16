import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'

import VOTING_ABI from '@/artifacts/abi/voting.json'
import type { Contract } from 'ethers'
import type { Proposal } from '@/types'
import BEACON_PROXY_ABI from '../artifacts/abi/beacon-proxy.json'
import { SmartContract } from './contractService'
import { VOTING_IMPL_ADDRESS, VOTING_BEACON_ADDRESS } from '@/constant'
import { BEACON_PROXY_BYTECODE } from '@/artifacts/bytecode/beacon-proxy'
import { useCustomFetch } from '@/composables/useCustomFetch'

export interface IVotingService {
  web3Library: IWeb3Library
  addProposal(votingAddress: string, proposal: Partial<Proposal>): Promise<any>
  getProposals(votingAddress: string): Promise<any>
  concludeProposal(votingAddress: string, proposalId: Number): Promise<any>
  voteDirective(votingAddress: string, proposalId: Number, directive: Number): Promise<any>
  voteElection(votingAddress: string, proposalId: Number, candidateAddress: string): Promise<any>
  createVotingContract(teamId: string): Promise<string>
}

export class VotingService implements IVotingService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }
  async createVotingContract(teamId: string): Promise<string> {
    const votingAddress = await this.deployVotingContract()
    const response = await useCustomFetch<string>(`teams/${teamId}`).put({ votingAddress }).json()

    return response.data.value.votingAddress
  }
  async addProposal(votingAddress: string, proposal: Partial<Proposal>): Promise<any> {
    proposal.id = 0
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.addProposal(proposal)
    await tx.wait()
    return tx
  }
  async getProposals(votingAddress: string): Promise<any> {
    const votingContract = await this.getVotingContract(votingAddress)
    const proposalCount = await votingContract.proposalCount()
    const proposals = []
    if (proposalCount === 0) {
      return []
    }
    for (let i = 0; i < proposalCount; i++) {
      proposals.push(await votingContract.proposalsById(i))
    }
    return proposals
  }
  async concludeProposal(votingAddress: string, proposalId: Number): Promise<any> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.concludeProposal(proposalId)
    await tx.wait()

    return tx
  }
  async voteDirective(votingAddress: string, proposalId: Number, vote: Number): Promise<any> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.voteDirective(proposalId, vote)
    await tx.wait()

    return tx
  }
  async voteElection(
    votingAddress: string,
    proposalId: Number,
    candidateAddress: string
  ): Promise<any> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.voteElection(proposalId, candidateAddress)
    await tx.wait()

    return tx
  }

  private async getVotingContract(votingContractAddress: string): Promise<Contract> {
    const votingContract = await this.web3Library.getContract(votingContractAddress, VOTING_ABI)

    return votingContract
  }

  async getContract(votingAddress: string): Promise<Contract> {
    const contractService = this.getContractService(votingAddress)

    return await contractService.getContract()
  }
  private getContractService(votingAddress: string): SmartContract {
    return new SmartContract(votingAddress, VOTING_ABI)
  }
  private async deployVotingContract(): Promise<string> {
    const votingImplementation = await this.getContract(VOTING_IMPL_ADDRESS)
    console.log('Voting implementation:', votingImplementation.interface.fragments)
    const votingProxyFactory = await this.web3Library.getFactoryContract(
      BEACON_PROXY_ABI,
      BEACON_PROXY_BYTECODE
    )
    const beaconProxyDeployment = await votingProxyFactory.deploy(
      VOTING_BEACON_ADDRESS,
      votingImplementation.interface.encodeFunctionData('initialize', [])
    )
    const beaconProxy = await beaconProxyDeployment.waitForDeployment()
    await beaconProxyDeployment.waitForDeployment()

    return await beaconProxy.getAddress()
  }
}
