import type { Address } from 'viem'
import type { FolderVersion } from '@/artifacts/registry'
import type { Member } from './member'
import type { TeamContract } from './teamContract'
import type { Wage } from './cash-remuneration'

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

/**
 * One deployment generation of a team's contracts, from
 * `GET /teams/:id?includeContractHistory=true`. The accounting layer scans each
 * one from its `deployBlockNumber` so pre-migration transactions survive (#2456).
 */
export interface ContractGeneration {
  officerAddress: Address | null
  deployBlockNumber: string | null
  deployedAt: string | null
  contracts: TeamContract[]
}

export interface Team {
  id: string
  name: string
  /**
   * Unique, URL-friendly identifier auto-generated from `name` on creation.
   * Names are no longer unique — teams may share one — so the slug is what
   * distinguishes homonyms (e.g. `acme-corp`, `acme-corp-2`).
   */
  slug: string
  description: string
  isHidden: boolean
  isArchived: boolean
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
  /**
   * Artifact-folder version (`v1` / `v2` / …) this team's contracts run on,
   * resolved backend-side from `currentOfficer.version`. Read via
   * `useContractVersion()` to branch explicitly on the team's contract version
   * (see composables/contracts/README.md). Optional: when absent the frontend
   * derives it from `currentOfficer.version`. Set by the backend (see the
   * version registry in contract/versions/registry.json).
   */
  contractVersion?: FolderVersion
  safeAddress?: Address
  teamContracts: TeamContract[]
  /** Per-generation contract history; only present with `includeContractHistory=true`. */
  contractHistory?: ContractGeneration[]
  _count?: { members: number }
  /**
   * The requesting user's own active wage on this team, or null when they have
   * none. Only returned by the teams *list* endpoint, which shows a per-viewer
   * wage badge on each card; the single-team endpoint exposes wages per member
   * via `members[].currentWage` instead.
   */
  callerWage?: Wage | null
}
