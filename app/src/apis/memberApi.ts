import { type Member } from '@/types'
import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'
import { isAddress } from 'ethers' // ethers v6

interface MemberAPI {
  deleteMember(id: string): Promise<void>
  updateMember(member: Member, id: string): Promise<Member>
  createMembers(newMembers: Member[], id: string): Promise<Member[]>
}
export class FetchMemberAPI implements MemberAPI {
  async createMembers(newMembers: Partial<Member>[], id: string): Promise<Member[]> {
    const token: string | null = AuthService.getToken()
    if (!token) {
      throw new Error('Token is null')
    }

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ membersData: newMembers })
    }

    for (const member of newMembers) {
      if (!isAddress(member.address)) {
        throw new Error(`Invalid wallet address`)
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
    const resObj = await response.json()
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    if (!resObj.success) {
      throw new Error(resObj.message)
    }
    return resObj.members
  }
  async updateMember(member: Partial<Member>, id: string): Promise<Member> {
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }
    const requestOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: member.name,
        address: member.address
      })
    }

    if (!isAddress(String(member.address))) {
      throw new Error(`Invalid wallet address`)
    }

    const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
    const resObj = await response.json()
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    if (!resObj.success) {
      throw new Error(resObj.message)
    }
    return resObj.member
  }
  async deleteMember(id: string): Promise<void> {
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }
    const requestOptions = {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
    const resObj = await response.json()
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    if (!resObj.success) {
      throw new Error(resObj)
    }
    return resObj.member
  }
}
