import type { Address } from 'viem'
import type { Member } from './member'
import type { TeamContract } from './teamContract'

export interface PreviousOfficerRef {
  id: number
  address: Address
}

export interface CurrentOfficer {
  id: number
  address: Address
  teamId: number
  deployer: string
  deployBlockNumber: string | null
  deployedAt: string | null
  previousOfficerId: number | null
  /**
   * Minimal ref to the Officer the current one points back to. Use
   * `previousOfficer.address` to read state off the old Officer generation
   * (e.g. shareholder migration).
   */
  previousOfficer: PreviousOfficerRef | null
  createdAt: string
  updatedAt: string
}

export interface Team {
  id: string
  name: string
  description: string
  members: Member[]
  ownerAddress: Address
  currentOfficer?: CurrentOfficer | null
  safeAddress?: Address
  teamContracts: TeamContract[]
  _count?: { members: number }
}
