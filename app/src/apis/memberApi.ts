import type { Member } from '@/types'
import { isAddress } from 'ethers' // ethers v6
import { BaseAPI } from '@/apis/baseApi'

interface MemberAPI {
  deleteMember(id: string): Promise<void>
  updateMember(member: Partial<Member>, id: string): Promise<Member>
  createMembers(newMembers: Partial<Member>[], id: string): Promise<Member[]>
}

export class FetchMemberAPI extends BaseAPI implements MemberAPI {
  async createMembers(newMembers: Partial<Member>[], id: string): Promise<Member[]> {
    for (const member of newMembers) {
      if (!isAddress(member.walletAddress)) {
        throw new Error(`Invalid wallet address: ${member.walletAddress}`)
      }
    }

    const resObj = await this.request(`/api/member/${id}`, 'POST', { membersData: newMembers })

    return resObj.members
  }

  async updateMember(member: Partial<Member>, id: string): Promise<Member> {
    if (!isAddress(String(member.walletAddress))) {
      throw new Error(`Invalid wallet address: ${member.walletAddress}`)
    }

    const resObj = await this.request(`/api/member/${id}`, 'PUT', {
      name: member.name,
      walletAddress: member.walletAddress
    })

    return resObj.member
  }

  async deleteMember(id: string): Promise<void> {
    const resObj = await this.request(`/api/member/${id}`, 'DELETE')

    return resObj.member
  }
}
