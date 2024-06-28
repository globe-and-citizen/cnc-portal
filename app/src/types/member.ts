export interface Member {
  id: string
  name: string
  address: string
  teamId: number
}
export interface MemberResponse {
  members: Member
  success: boolean
}
