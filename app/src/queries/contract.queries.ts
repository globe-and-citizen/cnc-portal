import { createMutationHook } from './queryFactory'
import { teamKeys } from './team.queries'

/**
 * Query key factory for contract-related queries
 */
export const contractKeys = {
  all: ['contracts'] as const
}

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
// DELETE /contract/reset - Reset contracts
// ============================================================================

/**
 * Combined parameters for useResetContractsMutation
 */
export interface ResetContractsParams {
  body: {
    /** Team ID */
    teamId: string
  }
}

/**
 * Reset/delete contracts for a team
 *
 * @endpoint DELETE /contract/reset
 * @pathParams none
 * @queryParams none
 * @body { teamId: string }
 */
export const useResetContractsMutation = createMutationHook<void, ResetContractsParams>({
  method: 'DELETE',
  endpoint: 'contract/reset',
  invalidateKeys: [contractKeys.all, teamKeys.all]
})
