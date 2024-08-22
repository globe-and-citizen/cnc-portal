import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'

import BOD_ABI from '@/artifacts/abi/bod.json'
import type { Contract } from 'ethers'
import BEACON_PROXY_ABI from '../artifacts/abi/beacon-proxy.json'
import { SmartContract } from './contractService'
import { BOD_IMPL_ADDRESS, BOD_BEACON_ADDRESS } from '@/constant'
import { BEACON_PROXY_BYTECODE } from '@/artifacts/bytecode/beacon-proxy'
import { useCustomFetch } from '@/composables/useCustomFetch'

export interface IBoDService {
  web3Library: IWeb3Library

  createBODContract(teamId: string, votingAddress: string): Promise<string>
  getBoardOfDirectors(bodAddress: string): Promise<string[]>
}
export class BoDService implements IBoDService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }
  async getBoardOfDirectors(bodAddress: string): Promise<string[]> {
    const bodContract = await this.getBoDContract(bodAddress)
    const boardOfDirectors = await bodContract.getBoardOfDirectors()
    return boardOfDirectors
  }
  async createBODContract(teamId: string, votingAddress: string): Promise<string> {
    const boardOfDirectorsAddress = await this.deployBoDContract(votingAddress)
    const response = await useCustomFetch<string>(`teams/${teamId}`)
      .put({ boardOfDirectorsAddress })
      .json()

    return response.data.value.boardOfDirectorsAddress
  }
  async getContract(bodAddress: string): Promise<Contract> {
    const contractService = this.getContractService(bodAddress)

    return await contractService.getContract()
  }
  private getContractService(bodAddress: string): SmartContract {
    return new SmartContract(bodAddress, BOD_ABI)
  }
  private async getBoDContract(bodAddress: string): Promise<Contract> {
    const bodContract = await this.web3Library.getContract(bodAddress, BOD_ABI)

    return bodContract
  }
  private async deployBoDContract(votingAddress: string): Promise<string> {
    const bodImplementation = await this.getContract(BOD_IMPL_ADDRESS)
    try {
      const bodProxyFactory = await this.web3Library.getFactoryContract(
        BEACON_PROXY_ABI,
        BEACON_PROXY_BYTECODE
      )
      const beaconProxyDeployment = await bodProxyFactory.deploy(
        BOD_BEACON_ADDRESS,
        bodImplementation.interface.encodeFunctionData('initialize', [[votingAddress]])
      )
      const beaconProxy = await beaconProxyDeployment.waitForDeployment()
      await beaconProxyDeployment.waitForDeployment()

      return await beaconProxy.getAddress()
    } catch (e) {
      console.log(e)
      return ''
    }
  }
}
