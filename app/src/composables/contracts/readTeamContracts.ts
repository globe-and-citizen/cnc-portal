import { readContract } from '@wagmi/core'
import type { Address } from 'viem'
import { ownablePausableAbi } from '@/artifacts/abi/ownable-pausable'
import { log } from '@/lib/logging'
import type { TeamContract } from '@/types'
import { config } from '@/wagmi.config'
import { CONTRACT_ABI_MAP } from '@/utils/contracts/abiDecode'

// Reads a single Ownable/Pausable view, tolerating contracts that do not
// implement it (for example, a Safe has no `owner` or `paused`).
const readContractField = async (address: Address, functionName: 'owner' | 'paused') => {
  try {
    return await readContract(config, { address, abi: ownablePausableAbi, functionName })
  } catch {
    return null
  }
}

export const getTeamContracts = async (contracts: TeamContract[]) => {
  try {
    return await Promise.all(
      contracts.map(async (contract) => {
        const [owner, paused] = await Promise.all([
          readContractField(contract.address, 'owner'),
          readContractField(contract.address, 'paused')
        ])

        return {
          ...contract,
          abi: CONTRACT_ABI_MAP[contract.type] ?? ownablePausableAbi,
          owner,
          paused
        }
      })
    )
  } catch (error) {
    log.error('Error fetching contract owners: ', error)
  }
}
