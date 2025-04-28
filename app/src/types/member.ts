export interface Member {
  id: string
  name: string
  address: string
  teamId: number
  imageUrl?: string
}
export interface MemberResponse {
  members: Member
  success: boolean
}
