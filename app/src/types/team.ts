import type { Member } from './member'

export interface Team {
  id: string
  name: string
  description: string
  bankAddress: string | null
  members: Member[]
  ownerAddress: string
}
export interface TeamsResponse {
  teams: Team[]
  success: boolean
}
