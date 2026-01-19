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
  _count?: { members: number }
}
