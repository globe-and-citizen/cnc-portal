import { ChainDisconnectedError } from 'viem'
import { NETWORK } from '@/constant'
import type { config } from '@/wagmi.config'

export const configuredChainId = Number(NETWORK.chainId) as (typeof config)['chains'][number]['id']
export const configuredNetworkName = NETWORK.networkName

/** Reject a stale target or provider network without prompting or replaying a write. */
export function assertConfiguredChain(chainId: unknown): void {
  if (Number(chainId) !== configuredChainId) {
    throw new ChainDisconnectedError(new Error(`Switch your wallet to ${configuredNetworkName}.`))
  }
}
