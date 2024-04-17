import type { Member } from '@/types/types'
import { AuthService } from '@/services/authService'
interface MemberAPI {
  deleteMember(id: string): Promise<void>
  updateMember(member: Member, id: string): Promise<void>
  createMembers(newMembers: Member[], id: string): Promise<void>
}
export class FetchMemberAPI implements MemberAPI {
  async createMembers(newMembers: Partial<Member>[], id: string): Promise<void> {
    const token = AuthService.getToken()

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(newMembers)
    }
    try {
      const response = await fetch(`http://localhost:3000/api/member/${id}`, requestOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }
  async updateMember(member: Partial<Member>, id: string): Promise<void> {
    const token = AuthService.getToken()

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
    try {
      const response = await fetch(`http://localhost:3000/api/member/${id}`, requestOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }
  async deleteMember(id: string): Promise<void> {
    const token = AuthService.getToken()
    const requestOptions = {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }

    try {
      const response = await fetch(`http://localhost:3000/api/member/${id}`, requestOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }
}
