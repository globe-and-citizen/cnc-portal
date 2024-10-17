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
  officerAddress?: string | null
  memberTeamsData?: MemberTeamsData
}
export interface TeamsResponse {
  teams: Team[]
  success: boolean
}
export interface TeamResponse {
  team: Team
  success: boolean
}
export interface MemberTeamsData {
  userAddress: string,
  roles: {
    id: number;
    roleId: number;
    role: {
      name: string;
      roleCategoryId: number;
    }
  }[]
}
