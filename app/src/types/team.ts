import type { Address } from 'viem'
import type { Member } from './member'
import type { TeamContract } from './teamContract'

export interface Team {
  id: string
  name: string
  description: string
  members: Member[]
  ownerAddress: Address
  officerAddress?: Address
  teamContracts: TeamContract[]
}
export interface TeamsResponse {
  teams: Team[]
  success: boolean
}
export interface TeamResponse {
  team: Team
  success: boolean
}
