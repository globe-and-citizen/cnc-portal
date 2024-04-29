import { ToastType, type Member } from '@/types'
import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'
import { isAddress } from 'ethers' // ethers v6
import { useToastStore } from '@/stores/toast'
import { useErrorHandler } from '@/composables/errorHandler'

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
    const { show } = useToastStore()

    newMembers.map((member: Partial<Member>) => {
      if (!isAddress(member.walletAddress)) {
        useErrorHandler().handleError(new Error(`Invalid wallet address`))
      }
    })
    const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
    const resObj = await response.json()
    if (!resObj.success) {
      useErrorHandler().handleError(response)
    }
    show(ToastType.Success, 'Updated Member Details')
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

    if (!isAddress(String(member.walletAddress))) {
      useErrorHandler().handleError(new Error(`Invalid wallet address`))
    }

    const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
    const resObj = await response.json()
    if (!resObj.success) {
      useErrorHandler().handleError(response)
    }
    show(ToastType.Success, 'Updated Member Details')
  }
  async deleteMember(id: string): Promise<void> {
    const token = AuthService.getToken()
    const requestOptions = {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/member/${id}`, requestOptions)
    const resObj = await response.json()
    if (!resObj.success) {
      useErrorHandler().handleError(response)
    }
  }
}
