import type { Member } from '@/types/types'
import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'
import { isWalletAddressValid } from '@/utils/walletValidatorUtil'
import { useToastStore } from '@/stores/toast'
import { ToastType } from '@/types'

interface MemberAPI {
  deleteMember(id: string): Promise<void>
  updateMember(member: Member, id: string): Promise<void>
  createMembers(newMembers: Member[], id: string): Promise<void>
}
export class FetchMemberAPI implements MemberAPI {
  async createMembers(newMembers: Partial<Member>[], id: string): Promise<void> {
    const token = AuthService.getToken()
    console.log(newMembers)
    newMembers.map((member: any) => {
      if (!isWalletAddressValid(member.walletAddress)) {
        throw new Error(`Invalid wallet address`)
      }
    })
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(newMembers)
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
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
    const { show } = useToastStore()

    try {
      if (!isWalletAddressValid(String(member.walletAddress))) {
        throw new Error(`Invalid wallet address`)
      }

      const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      show(ToastType.Success, 'Updated Member Details')
    } catch (error: any) {
      show(ToastType.Warning, error.message)
      console.error('Error:', error)
      throw error
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
      const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }
}
