import type { Abi, Address } from 'viem'
import {
  type ContractPauseCapability,
  type ContractPauseStatus,
  getContractPauseCapability
} from '@/utils/contracts/pauseCapabilities'
import { CONTRACT_ABI_MAP } from '@/utils/contracts/abiDecode'
import type { DeploymentContract } from '@/types/deployments'
import type { TeamContract } from '@/types'
import { config } from '@/wagmi.config'
import { log } from '@/lib/logging'
import { ownablePausableAbi } from '@/artifacts/abi/ownable-pausable'
import { readContract } from '@wagmi/core'

export interface ManagedContractReadModel extends Omit<TeamContract, 'admins' | 'type'> {
  type: string
  admins?: string[]
  abi: Abi
  owner: string | null
  pauseCapability?: ContractPauseCapability
  pauseStatus: ContractPauseStatus
}

// Reads a single Ownable/Pausable view, tolerating contracts that do not
// implement it (for example, a Safe has no `owner`).
const readContractField = async (address: Address, functionName: 'owner' | 'paused') => {
  try {
    return await readContract(config, { address, abi: ownablePausableAbi, functionName })
  } catch {
    return null
  }
}

const readPauseStatus = async (
  contract: DeploymentContract,
  capability?: ContractPauseCapability
): Promise<ContractPauseStatus> => {
  if (!capability) return 'unavailable'
  if (capability.support === 'none') return 'not-supported'

  const paused = await readContractField(contract.address, capability.selectors!.status)
  if (typeof paused !== 'boolean') return 'unavailable'
  return paused ? 'paused' : 'active'
}

export const readManagedContracts = async (
  contracts: readonly DeploymentContract[],
  officerVersion?: string | null
): Promise<ManagedContractReadModel[] | undefined> => {
  try {
    return await Promise.all(
      contracts.map(async (contract) => {
        const pauseCapability = getContractPauseCapability(contract.type, officerVersion)
        const [owner, pauseStatus] = await Promise.all([
          readContractField(contract.address, 'owner'),
          readPauseStatus(contract, pauseCapability)
        ])

        return {
          ...contract,
          abi: CONTRACT_ABI_MAP[contract.type] ?? ownablePausableAbi,
          owner: typeof owner === 'string' ? owner : null,
          pauseCapability,
          pauseStatus
        }
      })
    )
  } catch (error) {
    log.error('Error fetching contract owners: ', error)
  }
}
