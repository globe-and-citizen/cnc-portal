import type { Team, Member } from '@/types'
import { AuthService } from '@/services/authService'
import { AuthAPI } from '@/apis/authApi'
import { BACKEND_URL } from '@/constant/index'
import { isAddress } from 'ethers' // ethers v6

export interface TeamAPI {}

export class FetchTeamAPI implements TeamAPI {
  async getTeam(id: string, query?: string): Promise<Team | null> {
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }

    const queryParams = new URLSearchParams()
    if (query) {
      queryParams.append('query', query)
    }
    const url = `${BACKEND_URL}/api/teams/${id}?${queryParams.toString()}`
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }

    const response = await fetch(url, requestOptions)
    const resObj = await response.json()
    if (response.status === 401) {
      await AuthAPI.verifyToken(token)
      throw new Error(resObj.message)
    }
    if (!resObj.success) {
      throw new Error(resObj.message)
    }

    return resObj.team
  }
}
