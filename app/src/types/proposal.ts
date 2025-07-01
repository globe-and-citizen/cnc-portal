export interface Proposal {
  id: number
  title: string
  description: string
  draftedBy: string
  isActive: boolean
  isElection: boolean
  teamId: number
  winnerCount: number
  startDate?: Date | string
  endDate?: Date | string
  voters?: {
    memberAddress: string
    name: string
    isEligible?: boolean
    isVoted?: boolean
  }[]

  votes?: {
    yes: number
    no: number
    abstain: number
  }
  candidates?: {
    candidateAddress: string
    name: string
    votes?: number
  }[]
  hasTie?: boolean
  tiedCandidates?: string[]
  selectedTieBreakOption?: TieBreakOption
}

export enum TieBreakOption {
  RANDOM_SELECTION = 0,
  RUNOFF_ELECTION = 1,
  FOUNDER_CHOICE = 2,
  INCREASE_WINNER_COUNT = 3
}
