/**
 * Query Factory - Generic builders for TanStack Query hooks
 *
 * This module provides factory functions to create standardized TanStack Query hooks
 * with reduced boilerplate while maintaining full type safety and reactivity support.
 *
 * @example
 * ```typescript
 * // Define a query hook with only 2 generics: Response and Params
 * export const useGetTeamQuery = createQueryHook<Team, GetTeamParams>({
 *   endpoint: 'teams/{teamId}',
 *   queryKey: (params) => teamKeys.detail(toValue(params.pathParams?.teamId)),
 *   options: queryPresets.stable
 * })
 *
 * // Use in component
 * const { data, isLoading } = useGetTeamQuery({ pathParams: { teamId: 1 } })
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { QueryKey, UseQueryOptions, UseMutationOptions } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError, AxiosRequestConfig } from 'axios'

// ============================================================================
// Types
// ============================================================================

/**
 * HTTP methods supported by the factory
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Base params structure with optional pathParams and queryParams
 *
 * All params should define their structure inline:
 * @example
 * ```typescript
 * interface GetTeamParams {
 *   pathParams: { teamId: MaybeRefOrGetter<number> }
 * }
 *
 * interface ListTeamsParams {
 *   queryParams?: { page?: number; limit?: number }
 * }
 * ```
 */
export interface BaseQueryParams {
  pathParams?: Record<string, unknown>
  queryParams?: Record<string, unknown>
}

/**
 * Mutation params extends BaseQueryParams with optional body
 */
export interface BaseMutationParams extends BaseQueryParams {
  body?: unknown
}

/**
 * Configuration for creating a query hook
 */
export interface QueryConfig<TResponse, TParams extends BaseQueryParams> {
  /** Base endpoint URL (can include {param} placeholders) */
  endpoint: string | ((params: TParams) => string)

  /** Function to generate query key */
  queryKey: (params: TParams) => QueryKey

  /** Function to check if the query should be enabled */
  enabled?: (params: TParams) => boolean

  /** Transform response data before returning */
  transformResponse?: (data: unknown) => TResponse

  /** Default query options */
  options?: Omit<
    UseQueryOptions<TResponse, AxiosError, TResponse, QueryKey>,
    'queryKey' | 'queryFn' | 'enabled'
  >
}

/**
 * Configuration for creating a mutation hook
 */
export interface MutationConfig<TResponse, TParams extends BaseMutationParams> {
  /** HTTP method */
  method: HttpMethod

  /** Base endpoint URL (can include {param} placeholders) */
  endpoint: string | ((params: TParams) => string)

  /** Query keys to invalidate on success */
  invalidateKeys?: QueryKey[] | ((params: TParams, response: TResponse) => QueryKey[])

  /** Transform response data before returning */
  transformResponse?: (data: unknown) => TResponse

  /** Additional mutation options */
  options?: Omit<UseMutationOptions<TResponse, AxiosError, TParams>, 'mutationFn' | 'onSuccess'>

  /** Custom onSuccess handler (called after invalidation) */
  onSuccess?: (data: TResponse, params: TParams) => void | Promise<void>
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Recursively unwrap all MaybeRefOrGetter values in an object
 */
export function unwrapParams<T extends Record<string, unknown>>(
  params: T | undefined
): Record<string, unknown> | undefined {
  if (!params) return undefined

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    result[key] = toValue(value as MaybeRefOrGetter<unknown>)
  }
  return result
}

/**
 * Build endpoint URL by replacing {param} placeholders with actual values
 */
export function buildEndpoint<TParams extends BaseQueryParams>(
  endpoint: string | ((params: TParams) => string),
  params: TParams
): string {
  if (typeof endpoint === 'function') {
    return endpoint(params)
  }

  const pathParams = unwrapParams(params.pathParams as Record<string, unknown>)
  if (!pathParams) return endpoint

  let url = endpoint
  for (const [key, value] of Object.entries(pathParams)) {
    url = url.replace(`{${key}}`, String(value ?? ''))
  }
  return url
}

/**
 * Build axios request config with query params
 */
export function buildRequestConfig<TParams extends BaseQueryParams>(
  params: TParams
): AxiosRequestConfig | undefined {
  const queryParams = unwrapParams(params.queryParams as Record<string, unknown>)
  if (!queryParams || Object.keys(queryParams).length === 0) return undefined

  // Filter out undefined values
  const filteredParams: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      filteredParams[key] = value
    }
  }

  return Object.keys(filteredParams).length > 0 ? { params: filteredParams } : undefined
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a typed useQuery hook with standardized patterns
 *
 * Uses only 2 generic parameters:
 * - TResponse: The expected API response type
 * - TParams: The parameters interface (with pathParams/queryParams defined inline)
 *
 * @example
 * ```typescript
 * interface GetTeamParams {
 *   pathParams: { teamId: MaybeRefOrGetter<number> }
 * }
 *
 * export const useGetTeamQuery = createQueryHook<Team, GetTeamParams>({
 *   endpoint: 'teams/{teamId}',
 *   queryKey: (params) => teamKeys.detail(toValue(params.pathParams.teamId)),
 *   enabled: (params) => !!toValue(params.pathParams.teamId),
 *   options: queryPresets.stable
 * })
 * ```
 */
export function createQueryHook<TResponse, TParams extends BaseQueryParams>(
  config: QueryConfig<TResponse, TParams>
) {
  return (params: TParams) => {
    return useQuery<TResponse, AxiosError>({
      queryKey: config.queryKey(params),
      queryFn: async () => {
        const url = buildEndpoint(config.endpoint, params)
        const requestConfig = buildRequestConfig(params)
        const { data } = await apiClient.get<TResponse>(url, requestConfig)
        return config.transformResponse ? config.transformResponse(data) : data
      },
      enabled: config.enabled ? () => config.enabled!(params) : undefined,
      ...config.options
    })
  }
}

/**
 * Create a typed useMutation hook with standardized patterns
 *
 * Uses only 2 generic parameters:
 * - TResponse: The expected API response type
 * - TParams: The parameters interface (with pathParams/queryParams/body defined inline)
 *
 * @example
 * ```typescript
 * interface UpdateTeamParams {
 *   pathParams: { id: number }
 *   body: { name: string; description?: string }
 * }
 *
 * export const useUpdateTeamMutation = createMutationHook<Team, UpdateTeamParams>({
 *   method: 'PUT',
 *   endpoint: 'teams/{id}',
 *   invalidateKeys: (params) => [teamKeys.detail(params.pathParams.id), teamKeys.all]
 * })
 * ```
 */
export function createMutationHook<TResponse, TParams extends BaseMutationParams>(
  config: MutationConfig<TResponse, TParams>
) {
  return () => {
    const queryClient = useQueryClient()

    return useMutation<TResponse, AxiosError, TParams>({
      mutationFn: async (params: TParams) => {
        const url = buildEndpoint(config.endpoint, params)
        const requestConfig = buildRequestConfig(params)

        let response
        switch (config.method) {
          case 'POST':
            response = await apiClient.post<TResponse>(url, params.body, requestConfig)
            break
          case 'PUT':
            response = await apiClient.put<TResponse>(url, params.body, requestConfig)
            break
          case 'PATCH':
            response = await apiClient.patch<TResponse>(url, params.body, requestConfig)
            break
          case 'DELETE':
            response = await apiClient.delete<TResponse>(url, {
              ...requestConfig,
              data: params.body
            })
            break
          case 'GET':
            response = await apiClient.get<TResponse>(url, requestConfig)
            break
          default:
            throw new Error(`Unsupported HTTP method: ${config.method}`)
        }

        const data = response.data
        return config.transformResponse ? config.transformResponse(data) : data
      },
      onSuccess: async (data, params) => {
        // Invalidate specified query keys
        if (config.invalidateKeys) {
          const keys =
            typeof config.invalidateKeys === 'function'
              ? config.invalidateKeys(params, data)
              : config.invalidateKeys

          await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })))
        }

        // Call custom onSuccess handler
        if (config.onSuccess) {
          await config.onSuccess(data, params)
        }
      },
      ...config.options
    })
  }
}

// ============================================================================
// Default Options Presets
// ============================================================================

/**
 * Common query options presets for different data freshness requirements
 */
export const queryPresets = {
  /** For data that rarely changes (e.g., user profile, team info) */
  stable: {
    staleTime: 180000, // 3 minutes
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false
  },

  /** For data that changes moderately (e.g., lists, aggregations) */
  moderate: {
    staleTime: 60000, // 1 minute
    gcTime: 120000, // 2 minutes
    refetchOnWindowFocus: false
  },

  /** For data that changes frequently (e.g., notifications, real-time data) */
  dynamic: {
    staleTime: 10000, // 10 seconds
    gcTime: 60000, // 1 minute
    refetchOnWindowFocus: true
  },

  /** For one-time fetches (e.g., token validation) */
  once: {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    refetchInterval: false
  }
} as const
