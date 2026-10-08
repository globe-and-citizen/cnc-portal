/** Resolve Officer generations and scan boundaries without reactive state. */
import type { ContractType, TeamContract } from '@/types/teamContract'
import type { Address } from 'viem'

export interface ContractGeneration {
  deployBlockNumber: string | null
  contracts: { address: string; type: string; deployer?: string }[]
}

export function accountingGenerations(
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

export function generationContracts(generations: readonly ContractGeneration[]): TeamContract[] {
  return generations.flatMap(({ contracts }) =>
    contracts.map((contract) => ({
      address: contract.address as Address,
      type: contract.type as ContractType,
      deployer: (contract.deployer ?? contract.address) as Address,
      admins: []
    }))
  )
}

export function generationScanTargets(
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

/** Caller-supplied preference order wins over backend row order. */
export function currentContractAddress(
  contracts: ContractGeneration['contracts'],
  types: readonly ContractType[]
): string {
  for (const type of types) {
    const address = contracts.find((contract) => contract.type === type)?.address
    if (address) return address.toLowerCase()
  }
  return ''
}
