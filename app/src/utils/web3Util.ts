import { NETWORK } from '@/constant'
import type { Network } from '@/types'
import { createPublicClient, http } from 'viem'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from 'viem/chains'
import { providers } from 'ethers'
import type { Account, Chain, Client, Transport } from 'viem'

export const getChain = (chainIdStr: string | undefined) => {
  if (!chainIdStr) return sepolia // default to sepolia

  const id = chainIdStr.startsWith('0x') ? parseInt(chainIdStr, 16) : parseInt(chainIdStr)

  switch (id) {
    case mainnet.id:
      return mainnet
    case sepolia.id:
      return sepolia
    case polygon.id:
      return polygon
    case hardhat.id:
      return hardhat
    case polygonAmoy.id:
      return polygonAmoy
    default:
      return sepolia
  }
}

export const getPublicClient = (chainId = NETWORK.chainId) =>
  createPublicClient({
    chain: getChain(chainId),
    transport: http()
  })

/**
 * Hard-coded Polygon Mainnet configuration for Ethers v5
 */
const POLYGON_NETWORK = {
  chainId: 137,
  name: 'polygon',
  // Polymarket SDK typically doesn't need ensAddress on Polygon,
  // but we include it as undefined for type compliance.
  ensAddress: undefined
}

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, transport } = client

  // Use the hard-coded POLYGON_NETWORK instead of client.chain
  const provider = new providers.Web3Provider(transport, POLYGON_NETWORK)

  return provider.getSigner(account.address)
}

// TODO: this don't need to be a class
/*
The Goal of POO is to have an encapsulation of the attributes & restricts direct access to some of an object's components, which can prevent the accidental modification of data.

Here we juste need a function that return the provider and the network. No need to have an object for that
 */
interface EthereumProvider {
  request: (object: object) => Promise<void>
  on: (event: string, callback: () => void) => void
}

export class MetaMaskUtil {
  private provider: EthereumProvider
  private network: Network

  constructor() {
    if ('ethereum' in window) {
      this.provider = window.ethereum as EthereumProvider
    } else {
      throw new Error('MetaMask Not Installed')
    }

    this.network = NETWORK
  }

  /**
   * Check if we have an installed wallet
   * @returns boolean
   */
  static hasInstalledWallet() {
    return 'ethereum' in window
  }

  /**
   * Switch network to the app network:
   * @description This method request the user to switch the network of the wallet to the app network
   *
   */
  async switchNetwork() {
    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.network.chainId }]
      })
    } catch (error: unknown) {
      interface ErrorCode {
        code: number
      }
      if ((error as ErrorCode).code === 4902) {
        await this.provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: this.network.chainId,
              chainName: this.network.networkName,
              rpcUrls: [this.network.rpcUrl],
              nativeCurrency: {
                symbol: this.network.currencySymbol,
                decimals: 18
              },
              blockExplorerUrls: this.network.blockExplorerUrl
                ? [this.network.blockExplorerUrl]
                : null
            }
          ]
        })
      } else {
        throw error
      }
    }
  }

  getProvider() {
    return this.provider
  }

  getNetwork() {
    return this.network
  }
}
