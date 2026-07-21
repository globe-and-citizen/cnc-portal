import { toValue, type MaybeRefOrGetter } from 'vue'
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

export interface InvestorMigration {
  id: number
  teamId: number
  previousInvestorAddress: string
  newInvestorAddress: string
  merkleRoot: string
  blockNumber: string
  shareholders: InvestorMigrationShareholder[]
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
// GET /investor-migration?teamId= - Fetch a team's persisted migration
// snapshot, if any (used by the future claim UI to recompute proofs)
// ============================================================================

export interface GetInvestorMigrationParams {
  queryParams: {
    teamId: MaybeRefOrGetter<string | number>
  }
}

export const useGetInvestorMigrationQuery = createQueryHook<
  InvestorMigration,
  GetInvestorMigrationParams
>({
  endpoint: 'investor-migration',
  queryKey: (params) => investorMigrationKeys.team(toValue(params.queryParams.teamId)),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  options: queryPresets.stable
})
