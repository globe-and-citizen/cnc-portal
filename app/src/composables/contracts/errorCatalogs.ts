import type {
  ContractErrorCatalog,
  ContractKey,
  RevertMessageResolver
} from './errorCatalogs.types'
import { resolveFromCatalog } from './errorCatalogs.types'

export type {
  ContractErrorCatalog,
  ContractKey,
  RevertMessageResolver
} from './errorCatalogs.types'
export { resolveFromCatalog } from './errorCatalogs.types'

const tokenAlreadySupported: RevertMessageResolver = (args) => {
  const [token] = args ?? []
  return `Token ${token ?? ''} is already supported`
}
const tokenNotSupportedWithAddr: RevertMessageResolver = (args) => {
  const [token] = args ?? []
  return `Token ${token ?? ''} is not supported`
}
const insufficientBalanceOZ: RevertMessageResolver = (args) => {
  const [balance, needed] = args ?? []
  return `Contract has insufficient native balance — needs ${needed}, only ${balance} available`
}
const insufficientTokenBalanceTokenFirst: RevertMessageResolver = (args) => {
  const [, required, available] = args ?? []
  return `Insufficient token balance — needs ${required}, only ${available} available`
}
const insufficientTokenBalanceNoToken: RevertMessageResolver = (args) => {
  const [required, available] = args ?? []
  return `Insufficient token balance — needs ${required}, only ${available} available`
}
const insufficientBalanceRequiredAvailable: RevertMessageResolver = (args) => {
  const [required, available] = args ?? []
  return `Insufficient balance — needs ${required}, only ${available} available`
}
const insufficientContractBalance: RevertMessageResolver = (args) => {
  const [required, available] = args ?? []
  return `Insufficient contract balance — needs ${required}, only ${available}`
}
const insufficientAllowance: RevertMessageResolver = (args) => {
  const [required, actual] = args ?? []
  return `Not enough token allowance — needs ${required}, only ${actual}`
}
const insufficientBalanceRequiredActual: RevertMessageResolver = (args) => {
  const [required, actual] = args ?? []
  return `Insufficient token balance — needs ${required}, only ${actual}`
}
const insufficientFundedTokenBalance: RevertMessageResolver = (args) => {
  const [, required, available] = args ?? []
  return `Insufficient funded token balance — needs ${required}, only ${available}`
}
const insufficientNativeBalance: RevertMessageResolver = (args) => {
  const [required, available] = args ?? []
  return `Insufficient native balance — needs ${required}, only ${available}`
}

/**
 * Single source of truth for contract revert → user message resolution.
 * Keep entries in sync with Solidity sources under `contract/contracts/`.
 */
export const CONTRACT_ERRORS: ContractErrorCatalog = {
  common: {
    ZeroAddress: 'A required address is not set',
    ZeroAmount: 'Amount must be greater than zero',
    ZeroValue: 'Must send a positive amount',
    ZeroSender: 'Invalid caller address',
    OfficerAddressNotSet: 'Officer contract is not configured',
    BankContractNotFound: 'Bank contract could not be located',
    InvestorContractNotFound: 'Investor contract could not be located',
    BoardOfDirectorsNotFound: 'BoardOfDirectors contract could not be located',
    TokenTransferFailed: 'Token transfer failed',

    // OpenZeppelin inherited errors
    OwnableUnauthorizedAccount: 'Only the contract owner can perform this action',
    OwnableInvalidOwner: 'Invalid owner address',
    EnforcedPause: 'Contract is paused',
    ExpectedPause: 'Contract is not paused',
    ReentrancyGuardReentrantCall: 'Reentrant call detected',
    InvalidInitialization: 'Contract is already initialized',
    NotInitializing: 'Contract is not initializing',
    ECDSAInvalidSignature: 'Invalid signature',
    ECDSAInvalidSignatureLength: 'Invalid signature length',
    ECDSAInvalidSignatureS: 'Invalid signature S value',
    AddressInsufficientBalance: 'Contract has insufficient native balance for this transfer',
    AddressEmptyCode: 'Target address has no contract code',
    FailedCall: 'Inner contract call failed',
    FailedInnerCall: 'Inner contract call failed',

    // OZ v5.1+ generic — default to OZ's (balance, needed) shape
    InsufficientBalance: insufficientBalanceOZ,

    // TokenSupport base (shared across all contracts that extend it)
    TokenSupportZeroAddress: 'Token address cannot be zero',
    TokenSupportAlreadyAdded: tokenAlreadySupported,
    TokenSupportNotFound: tokenNotSupportedWithAddr
  },
  perContract: {
    CashRemuneration: {
      NotClaimOwner: 'You are not authorized to withdraw this claim',
      WageAlreadyPaid: 'This claim has already been withdrawn',
      ClaimIsDisabled: 'This claim has been disabled by the owner',
      TokenNotSupported: 'Add Token support: Token not supported',
      InsufficientTokenBalance: insufficientTokenBalanceTokenFirst,
      UnauthorizedAccess: 'The claim signature is not signed by the contract owner'
    },
    ExpenseAccount: {
      UnauthorizedAccess: 'Signer is not authorized',
      AmountPerPeriodExceeded: 'Amount per period exceeded',
      AmountPerTransactionExceeded: 'Amount per transaction exceeded',
      ApprovalNotActive: 'Approval is not yet active',
      ApprovalExpired: 'Approval has expired',
      SpenderNotApproved: 'You are not the approved spender for this budget',
      SignerNotAuthorized: 'The signature is not from the contract owner',
      TransferNotAllowed: 'Transfer not allowed by budget limits',
      InsufficientNativeBalance: insufficientNativeBalance,
      InsufficientTokenBalance: insufficientTokenBalanceTokenFirst,
      AmountExceedsBudgetLimit: 'Amount exceeds the budget limit',
      OneTimeBudgetAlreadyUsed: 'This one-time budget has already been used',
      AmountExceedsPeriodBudget: 'Amount exceeds the budget for this period',
      TokenNotSupported: 'Token is not supported',
      InvalidCustomFrequency: 'Custom frequency must be greater than zero',
      InvalidFrequencyType: 'Invalid frequency type'
    },
    SafeDepositRouter: {
      InvalidOwner: 'Invalid owner address',
      InvalidSafeAddress: 'Invalid Safe address',
      InvalidInvestorAddress: 'Invalid investor token address',
      InvalidTokenAddress: 'Invalid token address',
      InvalidTokenDecimals: 'Token decimals are invalid for this router',
      MultiplierTooLow: 'Multiplier is below the minimum',
      InsufficientMinterRole: 'Router is missing minter role on the investor token',
      TokenNotSupported: 'This token is not supported by the router',
      TokenAlreadySupported: 'This token is already supported',
      SlippageExceeded: (args) => {
        const [expected, actual] = args ?? []
        return `Price moved too much — expected ${expected}, got ${actual}`
      },
      DepositsNotEnabled: 'Deposits are currently disabled'
    },
    Bank: {
      UnsupportedToken: tokenNotSupportedWithAddr,
      InsufficientBalance: insufficientBalanceRequiredAvailable,
      InvalidFeeBps: 'Fee configuration is invalid',
      FeeCollectorNotConfigured: 'Fee collector is not configured',
      FeeTransferFailed: 'Fee transfer failed',
      TransferFailed: 'Transfer failed'
    },
    AdCampaignManager: {
      NotAdminOrOwner: 'Caller is not an admin or the owner',
      InvalidCampaignCode: 'Invalid campaign code',
      CampaignNotActive: 'Campaign is not active',
      InsufficientContractBalance: insufficientContractBalance,
      BankTransferFailed: 'Transfer to bank contract failed',
      AdvertiserTransferFailed: 'Transfer to advertiser failed',
      NotAuthorizedWithdrawer: 'Only the advertiser, admin, or owner can withdraw',
      SpentLessThanClaimed: 'Reported amount spent is less than the amount already claimed',
      AlreadyAdmin: 'Already an admin',
      NotAnAdmin: 'Address is not an admin'
    },
    Vesting: {
      NotTeamOwner: 'Only the team owner can perform this action',
      TeamAlreadyExists: 'Team already exists',
      CliffExceedsDuration: 'Cliff period exceeds the vesting duration',
      VestingAlreadyExists: 'A vesting already exists for this member in this team',
      InsufficientAllowance: insufficientAllowance,
      InsufficientBalance: insufficientBalanceRequiredActual,
      VestingNotActive: 'Vesting is not active',
      NothingToRelease: 'Nothing to release'
    },
    InvestorV1: {
      NotBank: 'Only the Bank contract can call this function',
      InvalidNativeFunding: (args) => {
        const [expected, actual] = args ?? []
        return `Invalid native funding — expected ${expected}, got ${actual}`
      },
      NoTokensMinted: 'No tokens have been minted',
      NoShareholders: 'No shareholders to distribute to',
      NativeTransferFailed: 'Native token transfer failed',
      InsufficientFundedTokenBalance: insufficientFundedTokenBalance
    },
    Tips: {
      NoTeamMembers: 'Must have at least one team member',
      TooManyTeamMembers: (args) => {
        const [provided, limit] = args ?? []
        return `Too many team members — provided ${provided}, limit is ${limit}`
      },
      InsufficientBalance: insufficientContractBalance,
      SendFailed: 'Failed to send native tokens',
      NothingToWithdraw: 'No tips available to withdraw',
      BalanceNotCleared: 'Failed to clear balance after withdraw',
      SameLimit: 'New limit is the same as the old one',
      LimitTooHigh: (args) => {
        const [requested, maximum] = args ?? []
        return `Push limit ${requested} exceeds the maximum of ${maximum}`
      }
    },
    FeeCollector: {
      EmptyContractType: 'Contract type cannot be empty',
      InvalidBps: 'Fee basis points value is invalid',
      DuplicateContractType: 'Duplicate contract type is not allowed',
      InsufficientBalance: insufficientBalanceRequiredAvailable,
      WithdrawalFailed: 'Withdrawal failed',
      TokenNotSupported: 'Token is not supported',
      InsufficientTokenBalance: insufficientTokenBalanceNoToken
    },
    Elections: {
      ElectionNotFound: 'Election not found',
      ElectionNotActive: 'Election is not currently active',
      ElectionIsOngoing: 'A previous election is still ongoing',
      ElectionEnded: 'Election has ended',
      AlreadyVoted: 'You have already voted in this election',
      NotEligibleVoter: 'You are not eligible to vote in this election',
      ResultsAlreadyPublished: 'Election results have already been published',
      ResultsNotReady: 'Election results are not ready to be published',
      Unauthorized: 'You are not authorized to perform this action',
      InvalidSeatCount: 'Seat count must be an odd positive number',
      InvalidDates: 'Invalid election dates',
      InvalidCandidate: 'Invalid candidate',
      InsufficientCandidates: 'Not enough candidates for the seat count',
      DuplicateCandidates: 'Duplicate candidate addresses detected',
      NoEligibleVoters: 'Eligible voters list cannot be empty',
      DuplicateVoters: 'Duplicate voter addresses detected'
    },
    Proposals: {
      ProposalNotFound: 'Proposal not found',
      ProposalVotingNotStarted: 'Proposal voting has not started yet',
      ProposalVotingEnded: 'Proposal voting has ended',
      ProposalAlreadyVoted: 'You have already voted on this proposal',
      InvalidVote: 'Invalid vote option',
      OnlyBoardMember: 'Only board members can perform this action',
      NoBoardMembers: 'There are no board members',
      BoardOfDirectorAddressNotSet: 'BoardOfDirectors address is not set',
      NotAllowed: 'Action not allowed',
      InvalidProposalDates: 'Invalid proposal dates',
      InvalidProposalContent: 'Proposal title or description is invalid'
    },
    Voting: {
      EmptyTitle: 'Proposal title cannot be empty',
      NoCandidates: 'Election requires at least one candidate',
      ProposalNotFound: 'Proposal does not exist',
      ProposalNotActive: 'Proposal is not active',
      VoterNotRegistered: 'You are not registered to vote on this proposal',
      VoterNotEligible: 'You are not eligible to vote',
      VoterAlreadyVoted: 'You have already voted',
      CandidateNotFound: 'Candidate does not exist',
      OnlyFounder: 'Only the proposal creator can do this',
      NoTieToResolve: 'There is no tie to resolve',
      WrongTieBreakOption: 'Tie-break option must be FOUNDER_CHOICE',
      InvalidTieWinner: 'Selected winner must be one of the tied candidates',
      InvalidVote: 'Invalid vote value'
    },
    BoardOfDirectors: {
      ActionAlreadyExecuted: 'This action has already been executed',
      AlreadyApproved: 'You have already approved this action',
      NotApproved: 'You have not approved this action',
      EmptyList: 'The list cannot be empty',
      OwnerAlreadyExists: 'Owner already exists',
      OwnerNotFound: 'Owner not found',
      CallFailed: 'Execution of the action failed',
      NotOwner: 'Only an owner can call this function',
      NotBoardMember: 'Only a board of directors member can call this function',
      NotSelf: 'Only the contract itself can call this function'
    },
    Officer: {
      EmptyBeaconType: 'Beacon type cannot be empty',
      DuplicateBeaconType: 'Duplicate beacon type is not allowed',
      BeaconNotConfigured: (args) => {
        const [contractType] = args ?? []
        return `Beacon not configured for ${contractType ?? 'this contract type'}`
      },
      BodMustBeDeployedViaElections: 'BoardOfDirectors must be deployed through Elections',
      Unauthorized: 'You are not authorized to perform this action',
      EmptyContractType: 'Contract type cannot be empty',
      MissingInitializerData: (args) => {
        const [contractType] = args ?? []
        return `Missing initializer data for ${contractType ?? 'contract'}`
      },
      NotOwnerOrInitializing: 'Caller is not an owner and contract is not initializing'
    }
  },
  fallbacks: {
    CashRemuneration: 'Withdraw failed',
    ExpenseAccount: 'Transfer failed',
    SafeDepositRouter: 'Deposit failed',
    Bank: 'Bank action failed',
    AdCampaignManager: 'Ad campaign action failed',
    Vesting: 'Vesting action failed',
    InvestorV1: 'Investor action failed',
    Tips: 'Tips action failed',
    FeeCollector: 'Fee collector action failed',
    TokenSupport: 'Token support update failed',
    Elections: 'Election action failed',
    Proposals: 'Proposal action failed',
    Voting: 'Voting action failed',
    BoardOfDirectors: 'Board of directors action failed',
    Officer: 'Officer action failed',
    default: 'Transaction failed'
  }
}

/**
 * Resolves a revert name to a user-facing message using the unified `CONTRACT_ERRORS` catalog.
 */
export function resolveRevertMessage(
  revertName: string,
  revertArgs?: readonly unknown[],
  contract?: ContractKey
): string {
  return resolveFromCatalog(CONTRACT_ERRORS, revertName, revertArgs, contract)
}
