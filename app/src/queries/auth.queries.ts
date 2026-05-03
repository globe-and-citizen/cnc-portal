import { createMutationHook, createQueryHook, queryPresets } from './queryFactory'

/**
 * Query key factory for auth-related queries
 */
export const authKeys = {
  all: ['auth'] as const,
  validateToken: () => [...authKeys.all, 'validateToken'] as const
}

// ============================================================================
// GET /auth/token - Validate token
// ============================================================================

/**
 * Empty params for useGetValidateTokenQuery (no parameters needed)
 */

export interface GetValidateTokenParams {}

/**
 * Validate the current authentication token
 *
 * @endpoint GET /auth/token
 * @pathParams none
 * @queryParams none
 * @body none
 */
export const useGetValidateTokenQuery = createQueryHook<unknown, GetValidateTokenParams>({
  endpoint: 'auth/token',
  queryKey: () => authKeys.validateToken(),
  options: queryPresets.once
})

// ============================================================================
// POST /auth/siwe - Exchange SIWE signature for an access token
// ============================================================================

export interface SiweAuthBody {
  message: string
  signature: string
}

export interface SiweAuthResponse {
  accessToken: string
}

export interface SiweAuthParams {
  body: SiweAuthBody
}

/**
 * Exchange a signed SIWE message for a JWT access token.
 *
 * @endpoint POST /auth/siwe
 * @pathParams none
 * @queryParams none
 * @body { message, signature }
 */
export const useSiweAuthMutation = createMutationHook<SiweAuthResponse, SiweAuthParams>({
  method: 'POST',
  endpoint: 'auth/siwe'
})
