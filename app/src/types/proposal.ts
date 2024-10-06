export interface Proposal {
  id: Number
  title: string
  description: string
  draftedBy: string
  isActive: boolean
  isElection: boolean
  teamId: Number
  winnerCount: Number
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
}
