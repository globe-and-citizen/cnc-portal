export interface Team {
  id: string
  name: string
  description: string
  members: Member[]
}

export interface Member {
  id: string
  name: string
  walletAddress: string
  teamId: number
}

export interface MemberInput {
  name: string
  walletAddress: string
  id?: string
  isValid: boolean
}

export interface TeamInput {
  name: string
  description: string
  members: MemberInput[]
}
