import type { MemberInput } from "./member-input"

export interface TeamInput {
  name: string
  description: string
  members: MemberInput[]
}
