import type { ClassifiedError } from '@/utils/classifyError'

/**
 * Per-contract registry of Solidity custom-error names → user-facing messages.
 *
 * Values can be:
 *  - a plain string (the message to show)
 *  - a function that receives the decoded `revertArgs` and returns a message
 *    (use this when you want to include dynamic data, e.g. addresses/amounts)
 */
export type RevertMessageResolver = (args?: readonly unknown[]) => string

export interface ContractErrorCatalog {
  /** Map of Solidity custom-error name → user message. */
  reverts: Record<string, string | RevertMessageResolver>
  /** Fallback for reverts this catalog doesn't know about. */
  fallback?: string
}

/**
 * Resolves a `ClassifiedError` to a user-facing message using a contract's
 * catalog. For non-revert errors (user_rejected, network, etc.) we fall back
 * to the classifier's default `userMessage`.
 */
export function resolveMessage(
  classified: ClassifiedError,
  catalog: ContractErrorCatalog
): string {
  if (classified.category !== 'contract_revert' || !classified.revertName) {
    return classified.userMessage
  }
  const entry = catalog.reverts[classified.revertName]
  if (typeof entry === 'function') return entry(classified.revertArgs)
  if (typeof entry === 'string') return entry
  return catalog.fallback ?? classified.userMessage
}

// ─── Contract catalogs ──────────────────────────────────────────────────────

/**
 * CashRemunerationEIP712 — all require() reverts migrated to custom errors.
 * Keep in sync with `contract/contracts/CashRemunerationEIP712.sol`.
 */
export const CASH_REMUNERATION_ERRORS: ContractErrorCatalog = {
  reverts: {
    ZeroAddress: 'A required address is not set',
    NotClaimOwner: 'You are not authorized to withdraw this claim',
    WageAlreadyPaid: 'This claim has already been withdrawn',
    ClaimIsDisabled: 'This claim has been disabled by the owner',
    TokenNotSupported: 'Add Token support: Token not supported',
    InsufficientTokenBalance: (args) => {
      const [, required, available] = args ?? []
      return `Insufficient token balance — needs ${required}, only ${available} available`
    },
    UnauthorizedAccess: 'The claim signature is not signed by the contract owner',
    OfficerAddressNotSet: 'Officer contract is not configured',
    BankContractNotFound: 'Bank contract could not be located',
    TokenTransferFailed: 'Token transfer failed'
  },
  fallback: 'Withdraw failed'
}

/**
 * SafeDepositRouter — custom errors defined in the contract.
 * Keep in sync with `contract/contracts/SafeDepositRouter.sol`.
 */
export const SAFE_DEPOSIT_ROUTER_ERRORS: ContractErrorCatalog = {
  reverts: {
    InvalidOwner: 'Invalid owner address',
    InvalidSafeAddress: 'Invalid Safe address',
    InvalidInvestorAddress: 'Invalid investor token address',
    InvalidTokenAddress: 'Invalid token address',
    InvalidTokenDecimals: 'Token decimals are invalid for this router',
    MultiplierTooLow: 'Multiplier is below the minimum',
    ZeroAmount: 'Amount must be greater than zero',
    InsufficientMinterRole: 'Router is missing minter role on the investor token',
    TokenNotSupported: 'This token is not supported by the router',
    TokenAlreadySupported: 'This token is already supported',
    SlippageExceeded: (args) => {
      const [expected, actual] = args ?? []
      return `Price moved too much — expected ${expected}, got ${actual}`
    },
    DepositsNotEnabled: 'Deposits are currently disabled'
  },
  fallback: 'Deposit failed'
}
