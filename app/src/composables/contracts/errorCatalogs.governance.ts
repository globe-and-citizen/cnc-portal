import type { ContractErrorCatalog } from './errorCatalogs.types'

/**
 * Elections — custom errors from the Elections contract.
 * Keep in sync with `contract/contracts/Elections/Elections.sol`.
 */
export const ELECTIONS_ERRORS: ContractErrorCatalog = {
  reverts: {
    ElectionNotFound: 'Election not found',
    ElectionNotActive: 'Election is not currently active',
    ElectionIsOngoing: 'A previous election is still ongoing',
    ElectionEnded: 'Election has ended',
    AlreadyVoted: 'You have already voted in this election',
    NotEligibleVoter: 'You are not eligible to vote in this election',
    ResultsAlreadyPublished: 'Election results have already been published',
    ResultsNotReady: 'Election results are not ready to be published',
    Unauthorized: 'You are not authorized to perform this action',
    ZeroSender: 'Invalid caller address',
    OfficerAddressNotSet: 'Officer contract is not configured',
    BoardOfDirectorsNotFound: 'BoardOfDirectors contract could not be located',
    InvalidSeatCount: 'Seat count must be an odd positive number',
    InvalidDates: 'Invalid election dates',
    InvalidCandidate: 'Invalid candidate',
    InsufficientCandidates: 'Not enough candidates for the seat count',
    DuplicateCandidates: 'Duplicate candidate addresses detected',
    NoEligibleVoters: 'Eligible voters list cannot be empty',
    DuplicateVoters: 'Duplicate voter addresses detected'
  },
  fallback: 'Election action failed'
}

/**
 * Proposals — custom errors from the Proposals contract.
 * Keep in sync with `contract/contracts/Proposals/Proposals.sol`.
 */
export const PROPOSALS_ERRORS: ContractErrorCatalog = {
  reverts: {
    ProposalNotFound: 'Proposal not found',
    ProposalVotingNotStarted: 'Proposal voting has not started yet',
    ProposalVotingEnded: 'Proposal voting has ended',
    ProposalAlreadyVoted: 'You have already voted on this proposal',
    InvalidVote: 'Invalid vote option',
    OnlyBoardMember: 'Only board members can perform this action',
    NoBoardMembers: 'There are no board members',
    BoardOfDirectorAddressNotSet: 'BoardOfDirectors address is not set',
    NotAllowed: 'Action not allowed',
    ZeroSender: 'Invalid caller address',
    OfficerAddressNotSet: 'Officer contract is not configured',
    BoardOfDirectorsNotFound: 'BoardOfDirectors contract could not be located',
    InvalidProposalDates: 'Invalid proposal dates',
    InvalidProposalContent: 'Proposal title or description is invalid'
  },
  fallback: 'Proposal action failed'
}

/**
 * Voting — custom errors from the Voting contract.
 * Keep in sync with `contract/contracts/Voting/Voting.sol`.
 */
export const VOTING_ERRORS: ContractErrorCatalog = {
  reverts: {
    ZeroSender: 'Invalid caller address',
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
    InvalidVote: 'Invalid vote value',
    OfficerAddressNotSet: 'Officer contract is not configured',
    BoardOfDirectorsNotFound: 'BoardOfDirectors contract could not be located'
  },
  fallback: 'Voting action failed'
}

/**
 * BoardOfDirectors — custom errors from the BoardOfDirectors contract.
 * Keep in sync with `contract/contracts/BoardOfDirectors.sol`.
 */
export const BOARD_OF_DIRECTORS_ERRORS: ContractErrorCatalog = {
  reverts: {
    ZeroAddress: 'A required address is not set',
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
  fallback: 'Board of directors action failed'
}

/**
 * Officer — custom errors from the Officer contract.
 * Keep in sync with `contract/contracts/Officer.sol`.
 */
export const OFFICER_ERRORS: ContractErrorCatalog = {
  reverts: {
    ZeroAddress: 'A required address is not set',
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
  },
  fallback: 'Officer action failed'
}
