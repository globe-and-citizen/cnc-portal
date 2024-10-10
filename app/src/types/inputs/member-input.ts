import type { Role } from '../role'

export interface MemberInput {
  name: string
  address: string
  id?: string
  roles?: Role[]
}
