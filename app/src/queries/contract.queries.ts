import { toValue, type MaybeRefOrGetter } from 'vue'
import { createMutationHook, createQueryHook, queryPresets } from './queryFactory'
import { teamKeys } from './team.queries'

/**
 * Query key factory for contract-related queries
 */
export const contractKeys = {
  all: ['contracts'] as const,
  officers: (teamId: string | number) => [...contractKeys.all, 'officers', String(teamId)] as const
}

// ============================================================================
// GET /contract/officers?teamId= - List a team's Officer generations (history)
// ============================================================================

/** A contract governed by an Officer generation. */
export interface OfficerContract {
  id: number
  address: string
  type: string
  deployer: string
  officerId: number | null
}

/** One row of a team's Officer linked list, with the contracts it governs. */
export interface TeamOfficerWithContracts {
  id: number
  address: string
  version: string | null
  teamId: number
  deployer: string
  deployBlockNumber: string | null
  deployedAt: string | null
  previousOfficerId: number | null
  isCurrent: boolean
  contracts: OfficerContract[]
  createdAt: string
  updatedAt: string
}

export interface GetTeamOfficersParams {
  queryParams: {
    /** Team ID */
    teamId: MaybeRefOrGetter<string | number>
  }
}

/**
 * List the Officer generations of a team (newest first), each with the
 * contracts it governs.
 *
 * @endpoint GET /contract/officers
 * @queryParams { teamId }
 */
export const useGetTeamOfficersQuery = createQueryHook<
  TeamOfficerWithContracts[],
  GetTeamOfficersParams
>({
  endpoint: 'contract/officers',
  queryKey: (params) => contractKeys.officers(toValue(params.queryParams.teamId)),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  options: queryPresets.stable
})

// ============================================================================
// POST /contract - Create contract
// ============================================================================

/**
 * Request body for creating a contract
 */
export interface CreateContractBody {
  /** Team ID this contract belongs to */
  teamId: string
  /** Smart contract address */
  contractAddress: string
  /** Type of contract (e.g., "BoardOfDirectors", "ExpenseAccountEIP712") */
  contractType: string
  /** Address of the deployer */
  deployer: string
}

/**
 * Combined parameters for useCreateContractMutation
 */
export interface CreateContractParams {
  body: CreateContractBody
}

/**
 * Create a new contract
 *
 * @endpoint POST /contract
 * @pathParams none
 * @queryParams none
 * @body CreateContractBody
 */
export const useCreateContractMutation = createMutationHook<unknown, CreateContractParams>({
  method: 'POST',
  endpoint: 'contract',
  invalidateKeys: [teamKeys.all]
})

// ============================================================================
// PUT /contract/sync - Sync contracts
// ============================================================================

/**
 * Combined parameters for useSyncContractsMutation
 */
export interface SyncContractsParams {
  body: {
    /** Team ID */
    teamId: string
  }
}

/**
 * Sync contracts for a team
 *
 * @endpoint PUT /contract/sync
 * @pathParams none
 * @queryParams none
 * @body { teamId: string }
 */
export const useSyncContractsMutation = createMutationHook<void, SyncContractsParams>({
  method: 'PUT',
  endpoint: 'contract/sync',
  invalidateKeys: [contractKeys.all, teamKeys.all]
})

// ============================================================================
// POST /contract/officer - Register a freshly deployed Officer contract
// ============================================================================

export interface CreateOfficerBody {
  /** Team ID */
  teamId: string | number
  /** Newly deployed Officer contract address */
  address: string
  /** Block number of the deploy transaction receipt */
  deployBlockNumber?: number
  /** Timestamp of the deploy transaction, ISO string */
  deployedAt?: string
}

export interface CreateOfficerParams {
  body: CreateOfficerBody
}

export interface TeamOfficerResponse {
  id: number
  address: string
  teamId: number
  deployer: string
  deployBlockNumber: string | null
  deployedAt: string | null
  previousOfficerId: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateOfficerResponse {
  officer: TeamOfficerResponse
  /**
   * The TeamOfficer the new one points back to, or null if this is the first
   * Officer ever deployed for the team. Use `previousOfficer.address` to read
   * state off the old Officer generation (e.g. shareholder migration).
   */
  previousOfficer: TeamOfficerResponse | null
  contractsCreated: number
}

/**
 * Register a freshly deployed Officer contract on a team.
 * Records a new TeamOfficer row as the team's current Officer head and syncs
 * the contracts it governs in a single call.
 *
 * @endpoint POST /contract/officer
 */
export const useCreateOfficerMutation = createMutationHook<
  CreateOfficerResponse,
  CreateOfficerParams
>({
  method: 'POST',
  endpoint: 'contract/officer',
  invalidateKeys: [contractKeys.all, teamKeys.all]
})
