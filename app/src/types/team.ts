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
   * Officer-generation tag stamped at deploy time. 'v0.10' means the team
   * was deployed against the current CashRemunerationEIP712 typehash;
   * 'legacy' means it predates that. Drives `Team.isMigrated`.
   */
  version: string | null
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
  /**
   * True iff `currentOfficer.version === 'v0.10'`. Derived backend-side and
   * surfaced here so the UI can freeze new sign/submit flows while a team
   * is still on the previous CashRemunerationEIP712 contract version
   * (issue #1825).
   */
  isMigrated?: boolean
  safeAddress?: Address
  teamContracts: TeamContract[]
  _count?: { members: number }
}
