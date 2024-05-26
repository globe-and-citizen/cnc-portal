import type { Member } from './member'

export interface Team {
  id: string
  name: string
  description: string
  bankAddress: string | null
  members: Member[]
}
