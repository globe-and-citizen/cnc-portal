import { defineStore } from "pinia"

export const useMembersStore = defineStore('member', {
  state: () => ({
    members: [
      {
        id: 1,
        name: 'John Doe',
        address: '0x1234567890123456789012345678901234567890'
      },
      {
        id: 2,
        name: 'John Doe',
        address: '0x1234567890123456789012345678901234567890'
      },
      {
        id: 3,
        name: 'John Doe',
        address: '0x1234567890123456789012345678901234567890'
      },
    ] as Member[],
  })
})

export interface Member {
  id: number
  name: string
  address: string
}
