/**
 * Safe composables - API interactions with Safe Transaction Service
 * Following CNC Portal repository patterns and Vue.js component standards
 */

// Types - use centralized types
export * from '@/types/safe'

// Utilities - use centralized utils
export {
  getInjectedProvider,
  randomSaltNonce,
  getSafeHomeUrl,
  getSafeSettingsUrl,
  openSafeAppUrl
} from '@/utils/safe'

// SDK Management - centralized
export { useSafeSDK } from './useSafeSdk'

// Mutations (actions)
export { useSafeDeployment } from './useSafeDeployment'
export { useSafeProposal } from './useSafeProposal'
export { useSafeApproval } from './useSafeApproval'
export { useSafeExecution } from './useSafeExecution'
export { useSafeOwnerManagement } from './useSafeOwnerManagement'
export { useSafeTransfer } from './useSafeTransfer' // New transfer composable
