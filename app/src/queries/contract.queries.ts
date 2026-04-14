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

export interface CreateOfficerResponse {
  officer: {
    id: number
    address: string
    teamId: number
    deployer: string
    deployBlockNumber: string | null
    deployedAt: string | null
    createdAt: string
    updatedAt: string
  }
  contractsCreated: number
}

/**
 * Register a freshly deployed Officer contract on a team.
 * Updates team.officerAddress, records a TeamOfficer row and syncs the
 * contracts it governs in a single call.
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

