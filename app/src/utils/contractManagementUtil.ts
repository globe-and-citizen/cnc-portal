import type { Action, ActionResponse, TeamContract, User } from '@/types'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'
import { readContract } from '@wagmi/core'
import { log, parseError } from '@/utils'
import { OWNABLE_PAUSABLE_ABI } from '@/artifacts/abi/ownable-pausable'

export type FormattedAction = (Action & {
  requestedBy: User
  dateCreated: string
  title: string
  description: string
})[]

export const getUser = (
  address: string,
  members: User[],
  bodAddress = '',
  teamContracts?: TeamContract[]
): User => {
  const teamContract = teamContracts?.find((c) => c.address === address)
  if (teamContracts && teamContract) return { name: teamContract.type, address: address }
  else if (address === bodAddress) return { name: 'Board of Directors', address }
  else
    return (
      members.find((member) => member.address === address) || {
        name: 'User',
        address
      }
    )
}

export const filterAndFormatActions = (
  address: string,
  actions: ActionResponse | undefined,
  members: User[]
) => {
  if (!actions) return []
  return actions.data
    .filter((action) => action.targetAddress === address && action.isExecuted === false)
    .map((action) => ({
      ...action,
      requestedBy: getUser(action.userAddress, members),
      dateCreated: action.createdAt ? new Date(action.createdAt).toLocaleDateString() : '',
      description: JSON.parse(action.description).text,
      title: JSON.parse(action.description).title
    }))
}

// Reads a single Ownable/Pausable view, tolerating contracts that don't
// implement it (e.g. a Safe has no `owner`/`paused`) so one non-conforming
// contract never blanks the whole table.
const readContractField = async (address: Address, functionName: 'owner' | 'paused') => {
  try {
    return await readContract(config, { address, abi: OWNABLE_PAUSABLE_ABI, functionName })
  } catch {
    return null
  }
}

export const getTeamContracts = async (contracts: TeamContract[]) => {
  try {
    return Promise.all(
      contracts.map(async (contract) => {
        const [owner, paused] = await Promise.all([
          readContractField(contract.address, 'owner'),
          readContractField(contract.address, 'paused')
        ])

        return {
          ...contract,
          abi: OWNABLE_PAUSABLE_ABI,
          owner,
          paused
        }
      })
    )
  } catch (error) {
    log.error('Error fetching contract owners: ', parseError(error))
  }
}
