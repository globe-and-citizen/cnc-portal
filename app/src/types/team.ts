import type { Member } from './member'

export interface Team {
  id: string
  name: string
  description: string
  members: Member[]
}
