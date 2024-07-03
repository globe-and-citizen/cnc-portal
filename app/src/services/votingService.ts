import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import { PROXY_BYTECODE } from '@/artifacts/bytecode/proxy'
import PROXY_ABI from '../artifacts/abi/proxy.json'
import VOTING_ABI from '@/artifacts/abi/voting.json'
import type { Contract } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { VOTING_IMPL_ADDRESS } from '@/constant'
import type { Proposal } from '@/types'

export interface IVotingService {
  web3Library: IWeb3Library
  createVotingContract(teamId: string): Promise<string>
  addProposal(votingAddress: string, proposal: Partial<Proposal>): Promise<any>
  getProposals(votingAddress: string): Promise<any>
  concludeProposal(votingAddress: string, proposalId: number): Promise<any>
  voteDirective(votingAddress: string, proposalId: number, directive: number): Promise<any>
  voteElection(votingAddress: string, electionId: number, candidateAddress: string): Promise<any>
}

export class VotingService implements IVotingService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async createVotingContract(teamId: string): Promise<any> {
    const votingAddress = await this.deployVotingContract()
    const response = await useCustomFetch<string>(`teams/${teamId}`).put({ votingAddress }).json()
    return response.data.value.votingAddress
  }
  async addProposal(votingAddress: string, proposal: Partial<Proposal>): Promise<any> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.addProposal(proposal)
    await tx.wait()
    return tx
  }
  async getProposals(votingAddress: string): Promise<any> {
    const votingContract = await this.getVotingContract(votingAddress)
    const proposals = await votingContract.getProposals()

    return proposals
  }
  async concludeProposal(votingAddress: string, proposalId: number): Promise<any> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.concludeProposal(proposalId)
    await tx.wait()

    return tx
  }
  async voteDirective(votingAddress: string, proposalId: number, directive: number): Promise<any> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.voteDirective(proposalId, directive)
    await tx.wait()

    return tx
  }
  async voteElection(
    votingAddress: string,
    electionId: number,
    candidateAddress: string
  ): Promise<any> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.voteElection(electionId, candidateAddress)
    await tx.wait()

    return tx
  }
  private async deployVotingContract(): Promise<any> {
    try {
      const proxyFactory = await this.web3Library.getFactoryContract(PROXY_ABI, PROXY_BYTECODE)

      const proxyDeployment = await proxyFactory.deploy(
        VOTING_IMPL_ADDRESS,
        await this.web3Library.getAddress(),
        '0x'
      )
      const proxy = await proxyDeployment.waitForDeployment()

      return await proxy.getAddress()
    } catch (e) {
      console.log(e)
    }
  }
  private async getVotingContract(votingContractAddress: string): Promise<Contract> {
    const votingContract = await this.web3Library.getContract(votingContractAddress, VOTING_ABI)

    return votingContract
  }
}
