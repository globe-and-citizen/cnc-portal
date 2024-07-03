export interface Proposal {
  id: string
  title: string
  description: string
  teamId: string
  draftedBy: string
  status: boolean
  isElection: boolean
  voters: {
    address: string
    name: string
    votes: number
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
