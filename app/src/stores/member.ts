import type { Member } from "@/types"
import { defineStore } from "pinia"

export const useMembersStore = defineStore('member', {
  state: () => ({
    members: [
      {
        id: 1,
        name: 'John Doe',
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      },
      {
        id: 2,
        name: 'David Doe',
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
      },
      {
        id: 3,
        name: 'Jane Doe',
        address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
      },
    ] as Member[],
  })
})
