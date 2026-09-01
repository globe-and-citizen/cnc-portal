import type { Action, ActionResponse, TeamContract, User } from '@/types'
import { z } from 'zod'
import { formatDate } from '@/utils/format'

export type FormattedAction = (Action & {
  requestedBy: User
  dateCreated: string
  title: string
  description: string
})[]

const actionDescriptionSchema = z.object({
  title: z.string(),
  text: z.string()
})

const malformedActionDescription = {
  title: 'Action details unavailable',
  description: 'The action description could not be read.'
}

function parseActionDescription(value: unknown) {
  if (typeof value !== 'string') return malformedActionDescription

  try {
    const result = actionDescriptionSchema.safeParse(JSON.parse(value))
    return result.success
      ? { title: result.data.title, description: result.data.text }
      : malformedActionDescription
  } catch {
    return malformedActionDescription
  }
}

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
    .map((action) => {
      const description = parseActionDescription(action.description)

      return {
        ...action,
        requestedBy: getUser(action.userAddress, members),
        dateCreated: action.createdAt ? formatDate(action.createdAt) : '',
        description: description.description,
        title: description.title
      }
    })
}
