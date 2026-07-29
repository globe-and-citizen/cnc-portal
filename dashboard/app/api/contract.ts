import type { TeamOfficer } from '~/types'
import { apiFetch } from '~/lib/fetch'

/**
 * Fetch the Officer linked-list history for a team (newest first).
 * Backend: GET /api/contract/officers?teamId=<id>
 */
export const getTeamOfficers = async (teamId: number) => {
  return await apiFetch<TeamOfficer[]>('/contract/officers', {
    query: { teamId }
  })
}

export type OfficerVersionSyncStatus = 'updated' | 'unchanged' | 'unresolved'

export interface OfficerVersionSyncResult {
  officerId: number
  teamId: number
  teamName: string
  address: string
  isCurrent: boolean
  from: string | null
  to: string | null
  source: 'onchain' | 'beacon' | null
  status: OfficerVersionSyncStatus
}

export interface OfficerVersionSyncReport {
  chainId: number | null
  dryRun: boolean
  scanned: number
  updated: number
  unchanged: number
  unresolved: number
  results: OfficerVersionSyncResult[]
}

/**
 * Realign every stored TeamOfficer.version with the generation detected
 * on-chain. Admin only.
 * Backend: POST /api/admin/officer-versions/sync
 */
export const syncOfficerVersions = async (body: { dryRun?: boolean } = {}) => {
  return await apiFetch<OfficerVersionSyncReport>('/admin/officer-versions/sync', {
    method: 'POST',
    body
  })
}
