/**
 * Central export for all dashboard query hooks
 * This allows for easy imports: import { useUserQuery, useUsers, useTokenPricesQuery } from '@/queries'
 */

export * from './user.queries'
export * from './feature.query'
export { useTokenPricesQuery } from './useTokenPricesQuery'
