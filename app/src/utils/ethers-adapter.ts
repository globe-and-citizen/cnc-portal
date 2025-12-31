// utils/ethers-adapter.ts
import { providers } from 'ethers'
import type { Account, Chain, Client, Transport } from 'viem'

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
