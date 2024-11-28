import type { Member } from './member'

export interface Team {
  id: string
  name: string
  description: string
  bankAddress: string | null
  members: Member[]
  ownerAddress: string
  votingAddress: string | null
  boardOfDirectorsAddress: string | null
  expenseAccountAddress?: string | null
  expenseAccountEip712Address?: string | null
  investorsAddress?: string | null
  officerAddress?: string | null
}
export interface TeamsResponse {
  teams: Team[]
  success: boolean
}
export interface TeamResponse {
  team: Team
  success: boolean
}
