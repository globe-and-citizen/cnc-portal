import { NETWORK } from '@/constant'
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
  ensAddress: undefined
}

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, transport } = client

  // Use the hard-coded POLYGON_NETWORK instead of client.chain
  const provider = new providers.Web3Provider(transport, POLYGON_NETWORK)

  return provider.getSigner(account.address)
}
