import { toValue, type MaybeRefOrGetter } from 'vue'
import type { Hex } from 'viem'
import { createMutationHook, createQueryHook, queryPresets } from './queryFactory'

/**
 * Query key factory for the Investor v1->v2 migration snapshot
 */
export const investorMigrationKeys = {
  all: ['investorMigration'] as const,
  team: (teamId: string | number) => [...investorMigrationKeys.all, String(teamId)] as const
}

export interface InvestorMigrationShareholder {
  shareholder: string
  amount: string
}

export type InvestorMigrationProofs = Record<string, Hex[]>

export interface InvestorMigration {
  id: number
  teamId: number
  previousInvestorAddress: string
  newInvestorAddress: string
  merkleRoot: string
  blockNumber: string
  shareholders: InvestorMigrationShareholder[]
  proofs: InvestorMigrationProofs
  createdAt: string
}

// ============================================================================
// POST /investor-migration - Persist the frozen shareholder snapshot a v1->v2
// Merkle migration was built from
// ============================================================================

export interface CreateInvestorMigrationParams {
  body: {
    teamId: string | number
    previousInvestorAddress: string
    newInvestorAddress: string
    merkleRoot: string
    blockNumber: number
    shareholders: InvestorMigrationShareholder[]
  }
}

export const useCreateInvestorMigrationMutation = createMutationHook<
  InvestorMigration,
  CreateInvestorMigrationParams
>({
  method: 'POST',
  endpoint: 'investor-migration',
  invalidateKeys: (params) => [investorMigrationKeys.team(params.body.teamId)]
})

// ============================================================================
// GET /investor-migration?teamId= - Fetch all persisted migration snapshots
// for a team (returns empty array if none exist)
// ============================================================================

export interface GetInvestorMigrationParams {
  queryParams: {
    teamId: MaybeRefOrGetter<string | number>
  }
}

export const useGetInvestorMigrationQuery = createQueryHook<
  InvestorMigration[],
  GetInvestorMigrationParams
>({
  endpoint: 'investor-migration',
  queryKey: (params) => investorMigrationKeys.team(toValue(params.queryParams.teamId)),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  options: queryPresets.stable
})

// ============================================================================
// POST /investor-migration/generate - Generate Merkle snapshot + proofs
// (backend double-hash, ready for claim())
// ============================================================================

export interface MerkleSnapshotShareholder {
  address: string
  amount: string
}

export interface MerkleSnapshot {
  root: string
  shareholders: MerkleSnapshotShareholder[]
  proofs: Record<string, string[]>
  blockNumber: number
  totalSupply: string
}

export interface GenerateMerkleSnapshotParams {
  body: {
    investorV1Address: string
  }
}

export const useGenerateMerkleSnapshotMutation = createMutationHook<
  MerkleSnapshot,
  GenerateMerkleSnapshotParams
>({
  method: 'POST',
  endpoint: 'investor-migration/generate'
})
