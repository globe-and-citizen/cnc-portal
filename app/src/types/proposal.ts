export enum ProposalState {
  Active,
  Approved,
  Rejected,
  Tied
}

export type Proposal = {
  id: bigint
  title: string
  description: string
  proposalType: string
  startDate: bigint
  endDate: bigint
  creator: string
  voteCount: bigint
  totalVoters: bigint
  yesCount: bigint
  noCount: bigint
  abstainCount: bigint
  state: ProposalState
}

export type ProposalVoteEvent = {
  proposalId: bigint | undefined
  voter: string | undefined
  vote: 'yes' | 'no' | 'abstain' | undefined
  timestamp: string | undefined
}

export enum TieBreakOption {
  RANDOM_SELECTION = 0,
  RUNOFF_ELECTION = 1,
  FOUNDER_CHOICE = 2,
  INCREASE_WINNER_COUNT = 3
}
