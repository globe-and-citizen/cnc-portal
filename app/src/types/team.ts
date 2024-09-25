import type { Member } from './member'
import type { ContractAddress } from './contract'
export interface Team {
  id: string
  name: string
  description: string
  bankAddress: string | null
  members: Member[]
  ownerAddress: string
  votingAddress: string | null
  addCampaignAddress: string | null
  addCampaignAddresses: string[]
  contracts: ContractAddress[]
  contract: ContractAddress | null
  boardOfDirectorsAddress: string | null
}
export interface TeamsResponse {
  teams: Team[]
  success: boolean
}
export interface TeamResponse {
  team: Team
  success: boolean
}
