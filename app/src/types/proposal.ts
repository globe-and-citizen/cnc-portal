export interface Proposal {
  id: string
  title: string
  description: string
  draftedBy: string
  isActive: boolean
  isElection: boolean
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
    address: string
    name: string
    votes: number
  }[]
}
