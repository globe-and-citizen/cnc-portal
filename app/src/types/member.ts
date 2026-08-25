import type { Wage } from '@/types/cash-remuneration'

export interface Member {
  id: string
  name: string
  address: string
  teamId: number
  imageUrl?: string
  currentWage?: Wage
}

/** Describes which members a member-selection input allows a user to choose. */
export type MemberSelectionScope = 'all-users' | 'team-members' | 'non-team-members'
