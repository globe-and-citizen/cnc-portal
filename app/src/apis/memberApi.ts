import { type Member } from '@/types'
import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'
import { isAddress } from 'ethers' // ethers v6
import { AuthAPI } from './authApi'

interface MemberAPI {
  deleteMember(id: string): Promise<void>
  updateMember(member: Member, id: string): Promise<Member>
  createMembers(newMembers: Member[], id: string): Promise<Member[]>
}
export class FetchMemberAPI implements MemberAPI {
  async createMembers(newMembers: Partial<Member>[], id: string): Promise<Member[]> {
    const token: any = AuthService.getToken()

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ membersData: newMembers })
    }

    for (const member of newMembers) {
      if (!isAddress(member.walletAddress)) {
        throw new Error(`Invalid wallet address`)
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
    const resObj = await response.json()
    if (!resObj.success) {
      await AuthAPI.verifyToken(token)
      throw new Error(resObj.message)
    }
    return resObj.members
  }
  async updateMember(member: Partial<Member>, id: string): Promise<Member> {
    const token: any = AuthService.getToken()
    const requestOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: member.name,
        walletAddress: member.walletAddress
      })
    }

    if (!isAddress(String(member.walletAddress))) {
      throw new Error(`Invalid wallet address`)
    }

    const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
    const resObj = await response.json()
    if (!resObj.success) {
      await AuthAPI.verifyToken(token)
      throw new Error(resObj.message)
    }
    return resObj.member
  }
  async deleteMember(id: string): Promise<void> {
    const token: any = AuthService.getToken()
    const requestOptions = {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
    const resObj = await response.json()
    if (!resObj.success) {
      await AuthAPI.verifyToken(token)
      throw new Error(resObj)
    }
    return resObj.member
  }
}
