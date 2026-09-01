import type { Action, ActionResponse, TeamContract, User } from '@/types'
import { formatDate } from '@/utils/format'

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
  if (!actions?.data) return []
  return actions.data
    .filter((action) => action.targetAddress === address && action.isExecuted === false)
    .map((action) => ({
      ...action,
      requestedBy: getUser(action.userAddress, members),
      dateCreated: action.createdAt ? formatDate(action.createdAt) : '',
      description: JSON.parse(action.description).text,
      title: JSON.parse(action.description).title
    }))
}
