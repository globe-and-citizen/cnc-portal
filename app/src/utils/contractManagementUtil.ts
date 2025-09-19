import type { Action, ActionResponse, TeamContract, User } from '@/types'
import { config } from '@/wagmi.config'
import { readContract } from '@wagmi/core'
import { type Abi } from 'viem'
import { log, parseError } from '@/utils'
import ExpenseAccountAbi from '@/artifacts/abi/expense-account-eip712.json'
import BankAbi from '@/artifacts/abi/bank.json'

import CashRemunerationAbi from '@/artifacts/abi/CashRemunerationEIP712.json'
import ElectionsAbi from '@/artifacts/abi/elections.json'
import { INVESTOR_ABI as InvestorsAbi } from '@/artifacts/abi/investorsV1'
import { PROPOSALS_ABI as ProposalsAbi } from '@/artifacts/abi/proposals'
import VotingAbi from '@/artifacts/abi/voting.json'

export type FormattedAction = (Action & {
  requestedBy: User
  dateCreated: string
  title: string
  description: string
})[]

export const getUser = (address: string, members: User[], bodAddress = ''): User => {
  if (address === bodAddress) return { name: 'Board of Directors', address }
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

export const getTeamContracts = async (contracts: TeamContract[]) => {
  try {
    return Promise.all(
      contractsWithAbis(contracts)
        .filter((contract) => contract != null)
        .map(async (contract) => {
          if (!contract || !contract.abi) {
            log.info('Skipping contract with undefined or null ABI: ', contract)
            throw new Error('Contract is undefined or null')
          }
          const owner = await readContract(config, {
            address: contract.address,
            abi: contract.abi as Abi,
            functionName: 'owner'
          })

          const paused = await readContract(config, {
            address: contract.address,
            abi: contract.abi as Abi,
            functionName: 'paused'
          })

          return {
            ...contract,
            owner,
            paused
          }
        })
    )
  } catch (error) {
    log.error('Error fetching contract owners: ', parseError(error))
  }
}

const contractsWithAbis = (contracts: TeamContract[]) => {
  return contracts.map((contract) => {
    switch (contract.type) {
      case 'Bank':
        return { ...contract, abi: BankAbi }
      case 'CashRemunerationEIP712':
        return { ...contract, abi: CashRemunerationAbi }
      case 'Elections':
        return { ...contract, abi: ElectionsAbi }
      case 'ExpenseAccountEIP712':
        return { ...contract, abi: ExpenseAccountAbi }
      case 'InvestorsV1':
        return { ...contract, abi: InvestorsAbi }
      case 'Proposals':
        return { ...contract, abi: ProposalsAbi }
      case 'Voting':
        return { ...contract, abi: VotingAbi }
      default:
        return null // Default ABI if none matches
    }
  })
}
