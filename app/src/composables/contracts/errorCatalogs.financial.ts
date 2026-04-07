import type { ContractErrorCatalog } from './errorCatalogs.types'

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
    DepositsNotEnabled: 'Deposits are currently disabled',
    ZeroSender: 'Invalid caller address',
    OfficerAddressNotSet: 'Officer contract is not configured',
    InvestorContractNotFound: 'Investor contract could not be located'
  },
  fallback: 'Deposit failed'
}

/**
 * TokenSupport — shared base contract for supported-token management.
 * Keep in sync with `contract/contracts/base/TokenSupport.sol`.
 */
export const TOKEN_SUPPORT_ERRORS: ContractErrorCatalog = {
  reverts: {
    TokenSupportZeroAddress: 'Token address cannot be zero',
    TokenSupportAlreadyAdded: (args) => {
      const [token] = args ?? []
      return `Token ${token ?? ''} is already supported`
    },
    TokenSupportNotFound: (args) => {
      const [token] = args ?? []
      return `Token ${token ?? ''} is not supported`
    }
  },
  fallback: 'Token support update failed'
}

/**
 * ExpenseAccountEIP712 — custom errors from the ExpenseAccount contract.
 * Keep in sync with `contract/contracts/expense-account/ExpenseAccountEIP712.sol`.
 */
export const EXPENSE_ACCOUNT_ERRORS: ContractErrorCatalog = {
  reverts: {
    UnauthorizedAccess: 'Signer is not authorized',
    AmountPerPeriodExceeded: 'Amount per period exceeded',
    AmountPerTransactionExceeded: 'Amount per transaction exceeded',
    ApprovalNotActive: 'Approval is not yet active',
    ApprovalExpired: 'Approval has expired',
    ZeroAddress: 'A required address is not set',
    SpenderNotApproved: 'You are not the approved spender for this budget',
    SignerNotAuthorized: 'The signature is not from the contract owner',
    TransferNotAllowed: 'Transfer not allowed by budget limits',
    InsufficientNativeBalance: (args) => {
      const [required, available] = args ?? []
      return `Insufficient native balance — needs ${required}, only ${available}`
    },
    InsufficientTokenBalance: (args) => {
      const [, required, available] = args ?? []
      return `Insufficient token balance — needs ${required}, only ${available}`
    },
    TokenTransferFailed: 'Token transfer failed',
    AmountExceedsBudgetLimit: 'Amount exceeds the budget limit',
    OneTimeBudgetAlreadyUsed: 'This one-time budget has already been used',
    AmountExceedsPeriodBudget: 'Amount exceeds the budget for this period',
    TokenNotSupported: 'Token is not supported',
    InvalidCustomFrequency: 'Custom frequency must be greater than zero',
    InvalidFrequencyType: 'Invalid frequency type',
    ZeroAmount: 'Amount must be greater than zero',
    OfficerAddressNotSet: 'Officer contract is not configured',
    BankContractNotFound: 'Bank contract could not be located'
  },
  fallback: 'Transfer failed'
}

/**
 * Bank — custom errors from the Bank contract.
 * Keep in sync with `contract/contracts/Bank.sol`.
 */
export const BANK_ERRORS: ContractErrorCatalog = {
  reverts: {
    ZeroAddress: 'A required address is not set',
    OfficerAddressNotSet: 'Officer contract is not configured',
    InvestorContractNotFound: 'Investor contract could not be located',
    UnsupportedToken: (args) => {
      const [token] = args ?? []
      return `Token ${token ?? ''} is not supported`
    },
    ZeroAmount: 'Amount must be greater than zero',
    InsufficientBalance: (args) => {
      const [required, available] = args ?? []
      return `Insufficient balance — needs ${required}, only ${available} available`
    },
    InvalidFeeBps: 'Fee configuration is invalid',
    FeeCollectorNotConfigured: 'Fee collector is not configured',
    FeeTransferFailed: 'Fee transfer failed',
    TransferFailed: 'Transfer failed'
  },
  fallback: 'Bank action failed'
}

/**
 * AdCampaignManager — custom errors from the AdCampaignManager contract.
 * Keep in sync with `contract/contracts/AdCampaignManager.sol`.
 */
export const AD_CAMPAIGN_MANAGER_ERRORS: ContractErrorCatalog = {
  reverts: {
    NotAdminOrOwner: 'Caller is not an admin or the owner',
    ZeroAddress: 'A required address is not set',
    ZeroAmount: 'Amount must be greater than zero',
    InvalidCampaignCode: 'Invalid campaign code',
    CampaignNotActive: 'Campaign is not active',
    InsufficientContractBalance: (args) => {
      const [required, available] = args ?? []
      return `Insufficient contract balance — needs ${required}, only ${available}`
    },
    BankTransferFailed: 'Transfer to bank contract failed',
    AdvertiserTransferFailed: 'Transfer to advertiser failed',
    NotAuthorizedWithdrawer: 'Only the advertiser, admin, or owner can withdraw',
    SpentLessThanClaimed: 'Reported amount spent is less than the amount already claimed',
    AlreadyAdmin: 'Already an admin',
    NotAnAdmin: 'Address is not an admin'
  },
  fallback: 'Ad campaign action failed'
}

/**
 * Vesting — custom errors from the Vesting contract.
 * Keep in sync with `contract/contracts/Vesting.sol`.
 */
export const VESTING_ERRORS: ContractErrorCatalog = {
  reverts: {
    NotTeamOwner: 'Only the team owner can perform this action',
    ZeroAddress: 'A required address is not set',
    TeamAlreadyExists: 'Team already exists',
    CliffExceedsDuration: 'Cliff period exceeds the vesting duration',
    VestingAlreadyExists: 'A vesting already exists for this member in this team',
    InsufficientAllowance: (args) => {
      const [required, actual] = args ?? []
      return `Not enough token allowance — needs ${required}, only ${actual}`
    },
    InsufficientBalance: (args) => {
      const [required, actual] = args ?? []
      return `Insufficient token balance — needs ${required}, only ${actual}`
    },
    TokenTransferFailed: 'Token transfer failed',
    VestingNotActive: 'Vesting is not active',
    NothingToRelease: 'Nothing to release'
  },
  fallback: 'Vesting action failed'
}

/**
 * InvestorV1 — custom errors from the InvestorV1 contract.
 * Keep in sync with `contract/contracts/Investor/InvestorV1.sol`.
 */
export const INVESTOR_V1_ERRORS: ContractErrorCatalog = {
  reverts: {
    ZeroAddress: 'A required address is not set',
    OfficerAddressNotSet: 'Officer contract is not configured',
    BankContractNotFound: 'Bank contract could not be located',
    NotBank: 'Only the Bank contract can call this function',
    ZeroAmount: 'Amount must be greater than zero',
    InvalidNativeFunding: (args) => {
      const [expected, actual] = args ?? []
      return `Invalid native funding — expected ${expected}, got ${actual}`
    },
    NoTokensMinted: 'No tokens have been minted',
    NoShareholders: 'No shareholders to distribute to',
    NativeTransferFailed: 'Native token transfer failed',
    InsufficientFundedTokenBalance: (args) => {
      const [, required, available] = args ?? []
      return `Insufficient funded token balance — needs ${required}, only ${available}`
    }
  },
  fallback: 'Investor action failed'
}

/**
 * Tips — custom errors from the Tips contract.
 * Keep in sync with `contract/contracts/Tips.sol`.
 */
export const TIPS_ERRORS: ContractErrorCatalog = {
  reverts: {
    NoTeamMembers: 'Must have at least one team member',
    TooManyTeamMembers: (args) => {
      const [provided, limit] = args ?? []
      return `Too many team members — provided ${provided}, limit is ${limit}`
    },
    ZeroAddress: 'A required address is not set',
    InsufficientBalance: (args) => {
      const [required, available] = args ?? []
      return `Insufficient contract balance — needs ${required}, only ${available}`
    },
    SendFailed: 'Failed to send native tokens',
    NothingToWithdraw: 'No tips available to withdraw',
    BalanceNotCleared: 'Failed to clear balance after withdraw',
    ZeroValue: 'Must send a positive amount',
    SameLimit: 'New limit is the same as the old one',
    LimitTooHigh: (args) => {
      const [requested, maximum] = args ?? []
      return `Push limit ${requested} exceeds the maximum of ${maximum}`
    }
  },
  fallback: 'Tips action failed'
}

/**
 * FeeCollector — custom errors from the FeeCollector contract.
 * Keep in sync with `contract/contracts/FeeCollector.sol`.
 */
export const FEE_COLLECTOR_ERRORS: ContractErrorCatalog = {
  reverts: {
    ZeroAddress: 'A required address is not set',
    EmptyContractType: 'Contract type cannot be empty',
    InvalidBps: 'Fee basis points value is invalid',
    DuplicateContractType: 'Duplicate contract type is not allowed',
    InsufficientBalance: (args) => {
      const [required, available] = args ?? []
      return `Insufficient balance — needs ${required}, only ${available}`
    },
    WithdrawalFailed: 'Withdrawal failed',
    TokenNotSupported: 'Token is not supported',
    ZeroAmount: 'Amount must be greater than zero',
    InsufficientTokenBalance: (args) => {
      const [, required, available] = args ?? []
      return `Insufficient token balance — needs ${required}, only ${available}`
    }
  },
  fallback: 'Fee collector action failed'
}
