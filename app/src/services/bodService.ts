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

  createBODContract(teamId: string): Promise<string>
}
export class bodService implements IBoDService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }
  async createBODContract(teamId: string): Promise<string> {
    const bodAddress = await this.deployBoDContract()
    const response = await useCustomFetch<string>(`teams/${teamId}`).put({ bodAddress }).json()

    return response.data.value.bodAddress
  }
  async getContract(bodAddress: string): Promise<Contract> {
    const contractService = this.getContractService(bodAddress)

    return await contractService.getContract()
  }
  private getContractService(bodAddress: string): SmartContract {
    return new SmartContract(bodAddress, BOD_ABI)
  }
  private async deployBoDContract(): Promise<string> {
    const bodImplementation = await this.getContract(BOD_IMPL_ADDRESS)
    const bodProxyFactory = await this.web3Library.getFactoryContract(
      BEACON_PROXY_ABI,
      BEACON_PROXY_BYTECODE
    )
    const beaconProxyDeployment = await bodProxyFactory.deploy(
      BOD_BEACON_ADDRESS,
      bodImplementation.interface.encodeFunctionData('initialize', [])
    )
    const beaconProxy = await beaconProxyDeployment.waitForDeployment()
    await beaconProxyDeployment.waitForDeployment()

    return await beaconProxy.getAddress()
  }
}
