export interface Proposal {
  id: string
  title: string
  description: string
  teamId: string
  draftedBy: string
  status: boolean
  isElection: boolean

  votes?: {
    yes: number
    no: number
    abstain: number
  }
  votesForUsers?: {
    address: string
    name: string
    votes: number
  }[]
}
