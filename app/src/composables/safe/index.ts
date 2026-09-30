/**
 * Safe composables - API interactions with Safe Transaction Service
 * Following CNC Portal repository patterns and Vue.js component standards
 */

// Types - use centralized types
export * from '@/types/safe'

// Utilities - use centralized utils
export { getSafeHomeUrl } from '@/utils/safe/model'
export { openSafeAppUrl } from '@/lib/safe/browser'
