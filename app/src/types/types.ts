export interface Team {
  id: string
  name: string
  description: string
  members?: Member[]
}

export interface Member {
  id: string
  name: string
  walletAddress: string
  teamId: number
}
