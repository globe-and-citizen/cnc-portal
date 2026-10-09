/** Resolve Officer generations and scan boundaries without reactive state. */
import type { ContractType, TeamContract } from '@/types/teamContract'
import type { Address } from 'viem'

export interface ContractGeneration {
  deployBlockNumber: string | null
  contracts: { address: string; type: string; deployer?: string }[]
}

/**
 * Keep every historical Officer deployment in the accounting scope, then add
 * current contracts absent from that history (for example an independent Safe).
 * Without Officer history, scan all current contracts without a deployment bound.
 */
export function buildAccountingContractGenerations(
  current: ContractGeneration['contracts'],
  officers: readonly ContractGeneration[]
): ContractGeneration[] {
  if (!officers.length) return [{ deployBlockNumber: null, contracts: current }]
  const generations = officers.map(({ deployBlockNumber, contracts }) => ({
    deployBlockNumber,
    contracts
  }))
  const governed = new Set(
    officers.flatMap(({ contracts }) => contracts.map(({ address }) => address.toLowerCase()))
  )
  const officerless = current.filter(({ address }) => !governed.has(address.toLowerCase()))
  if (officerless.length) generations.push({ deployBlockNumber: null, contracts: officerless })
  return generations
}

/**
 * Flatten all generations into the deployment identities used by accounting
 * mappers. Missing deployers fall back to the contract address; these records
 * describe accounting identity, not authoritative admin permissions.
 */
export function flattenAccountingGenerationContracts(
  generations: readonly ContractGeneration[]
): TeamContract[] {
  return generations.flatMap(({ contracts }) =>
    contracts.map((contract) => ({
      address: contract.address as Address,
      type: contract.type as ContractType,
      deployer: (contract.deployer ?? contract.address) as Address,
      admins: []
    }))
  )
}

/**
 * Select event-scan addresses by contract type across all generations. Each
 * Officer deployment block is the lower scan bound; absent bounds stay undefined
 * so the log reader can choose its own fallback rather than omit earlier history.
 */
export function buildContractEventScanTargets(
  generations: readonly ContractGeneration[],
  types: readonly ContractType[]
) {
  const wanted = new Set<string>(types)
  return generations.flatMap((generation) =>
    generation.contracts
      .filter(({ type }) => wanted.has(type))
      .map(({ address }) => ({
        address: address.toLowerCase(),
        fromBlock: generation.deployBlockNumber ? BigInt(generation.deployBlockNumber) : undefined
      }))
  )
}

/**
 * Resolve a current contract for live reads, using the caller's contract-type
 * preference (for example Investor before InvestorV1) rather than backend order.
 * Return an empty string when absent so callers can disable the read.
 */
export function findPreferredCurrentContractAddress(
  contracts: ContractGeneration['contracts'],
  types: readonly ContractType[]
): string {
  for (const type of types) {
    const address = contracts.find((contract) => contract.type === type)?.address
    if (address) return address.toLowerCase()
  }
  return ''
}
