/**
 * Public entry point for contract error catalogs.
 *
 * Catalogs are split across `errorCatalogs.financial.ts` and
 * `errorCatalogs.governance.ts` to keep each file under the 300-line limit.
 * Shared types and the `resolveMessage` helper live in `errorCatalogs.types.ts`.
 */
export type { ContractErrorCatalog, RevertMessageResolver } from './errorCatalogs.types'
export { resolveMessage } from './errorCatalogs.types'

export {
  CASH_REMUNERATION_ERRORS,
  SAFE_DEPOSIT_ROUTER_ERRORS,
  TOKEN_SUPPORT_ERRORS,
  EXPENSE_ACCOUNT_ERRORS,
  BANK_ERRORS,
  AD_CAMPAIGN_MANAGER_ERRORS,
  VESTING_ERRORS,
  INVESTOR_V1_ERRORS,
  TIPS_ERRORS,
  FEE_COLLECTOR_ERRORS
} from './errorCatalogs.financial'

export {
  ELECTIONS_ERRORS,
  PROPOSALS_ERRORS,
  VOTING_ERRORS,
  BOARD_OF_DIRECTORS_ERRORS,
  OFFICER_ERRORS
} from './errorCatalogs.governance'
