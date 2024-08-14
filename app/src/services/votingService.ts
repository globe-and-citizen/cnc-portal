import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'

import VOTING_ABI from '@/artifacts/abi/voting.json'
import type { Contract } from 'ethers'
import { VOTING_ADDRESS } from '@/constant'
import type { Proposal } from '@/types'
import BEACON_PROXY_ABI from '../artifacts/abi/beacon-proxy.json'
import { SmartContract } from './contractService'
import { VOTING_IMPL_ADDRESS, VOTING_BEACON_ADDRESS } from '@/constant'
import { BEACON_PROXY_BYTECODE } from '@/artifacts/bytecode/beacon-proxy'

export interface IVotingService {
  web3Library: IWeb3Library
  addProposal(proposal: Partial<Proposal>): Promise<any>
  getProposals(teamId: Number): Promise<any>
  concludeProposal(teamId: Number, proposalId: Number): Promise<any>
  voteDirective(teamId: Number, proposalId: Number, directive: Number): Promise<any>
  voteElection(teamId: Number, proposalId: Number, candidateAddress: string): Promise<any>
}

export class VotingService implements IVotingService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async addProposal(proposal: Partial<Proposal>): Promise<any> {
    proposal.id = 0
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.addProposal(proposal)
    await tx.wait()
    return tx
  }
  async getProposals(): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const proposals = await votingContract.proposalsById()
    if (proposals === '0x' || !proposals) {
      // console.log('No proposals found or returned data is empty.')
      return []
    }
    // console.log(proposals)
    return proposals
  }
  async concludeProposal(teamId: Number, proposalId: Number): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.concludeProposal(teamId, proposalId)
    await tx.wait()

    return tx
  }
  async voteDirective(teamId: Number, proposalId: Number, vote: Number): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.voteDirective(teamId, proposalId, vote)
    await tx.wait()

    return tx
  }
  async voteElection(teamId: Number, proposalId: Number, candidateAddress: string): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.voteElection(teamId, proposalId, candidateAddress)
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
