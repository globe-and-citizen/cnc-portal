import type { MaybeRefOrGetter } from 'vue'

/**
 * Path parameters for GET single transaction
 */
export interface GetSafeTransactionPathParams {
  /** Safe transaction hash */
  safeTxHash: MaybeRefOrGetter<string | undefined>
}

/**
 * Query parameters for GET single transaction (none for this endpoint)
 */
export interface GetSafeTransactionQueryParams {}

/**
 * Path parameters for Safe incoming transfers endpoint
 */
export interface GetSafeIncomingTransfersPathParams {
  /** Safe address */
  safeAddress: MaybeRefOrGetter<string | undefined>
}

/**
 * Query parameters for Safe incoming transfers
 */
export interface GetSafeIncomingTransfersQueryParams {
  /** Number of results to fetch (default: 100) */
  limit?: number
}

/**
 * Combined parameters for useGetSafeIncomingTransfersQuery
 */
export interface GetSafeIncomingTransfersParams {
  pathParams: GetSafeIncomingTransfersPathParams
  queryParams?: GetSafeIncomingTransfersQueryParams
}

/**
 * Path parameters for Safe transactions endpoint
 */
export interface GetSafeTransactionsPathParams {
  /** Safe address */
  safeAddress: MaybeRefOrGetter<string | undefined>
}

/**
 * Query parameters for Safe transactions (none for this endpoint)
 */
export interface GetSafeTransactionsQueryParams {}

/**
 * Combined parameters for useGetSafeTransactionsQuery
 */
export interface GetSafeTransactionsParams {
  pathParams: GetSafeTransactionsPathParams
  queryParams?: GetSafeTransactionsQueryParams
}

/**
 * Path parameters for Safe info endpoint
 */
export interface GetSafeInfoPathParams {
  /** Safe address */
  safeAddress: MaybeRefOrGetter<string | undefined>
}

/**
 * Query parameters for Safe info (none for this endpoint)
 */
export interface GetSafeInfoQueryParams {}

/**
 * Combined parameters for useGetSafeInfoQuery
 */
export interface GetSafeInfoParams {
  pathParams: GetSafeInfoPathParams
  queryParams?: GetSafeInfoQueryParams
}

/**
 * Combined parameters for useGetSafeTransactionQuery
 */
export interface GetSafeTransactionParams {
  pathParams: GetSafeTransactionPathParams
  queryParams?: GetSafeTransactionQueryParams
}
