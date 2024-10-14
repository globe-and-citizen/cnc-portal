import type { MemberRole, Role } from '../role'

export interface MemberInput {
  name: string
  address: string
  id?: string
  //roles?: Role[]
  roles?: MemberRole[]
}
