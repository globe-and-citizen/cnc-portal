import type { Team, Member } from '@/types'
import { useOwnerAddressStore } from '@/stores/address'
import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'
import { isAddress } from 'ethers' // ethers v6
import { useErrorHandler } from '@/composables/errorHandler'

interface TeamAPI {
  getAllTeams(): Promise<Team[]>
  getTeam(id: string): Promise<Team | null>
  updateTeam(id: string, updatedTeamData: Partial<Team>): Promise<Team>
  deleteTeam(id: string): Promise<void>
  createTeam(teamName: string, teamDesc: string, teamMembers: Partial<Member>[]): Promise<Team>
}

export class FetchTeamAPI implements TeamAPI {
  async getAllTeams(): Promise<Team[]> {
    const token = AuthService.getToken()
    const ownerAddressStore = useOwnerAddressStore()
    const requestOptions = {
      method: 'GET',
      headers: {
        ownerAddress: ownerAddressStore.ownerAddress,
        Authorization: `Bearer ${token}`
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/teams`, requestOptions)
    const resObj = await response.json()
    if (!resObj.success) {
      useErrorHandler().handleError(resObj)
    }

    return resObj.teams
  }
  async getTeam(id: string): Promise<Team | null> {
    const ownerAddressStore = useOwnerAddressStore()
    const token = AuthService.getToken()
    const url = `${BACKEND_URL}/api/teams/${id}`
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ownerAddress: ownerAddressStore.ownerAddress
      }
    }

    const response = await fetch(url, requestOptions)
    const resObj = await response.json()
    if (!resObj.success) {
      useErrorHandler().handleError(resObj)
    }

    return resObj.team
  }
  async updateTeam(id: string, updatedTeamData: Partial<Team>): Promise<Team> {
    const ownerAddressStore = useOwnerAddressStore()
    const token = AuthService.getToken()

    const url = `${BACKEND_URL}/api/teams/${id}`
    const requestData = {
      ...updatedTeamData, // Spread the updated team data
      address: ownerAddressStore.ownerAddress
    }
    const requestOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    }

    const response = await fetch(url, requestOptions)
    const resObj = await response.json()
    console.log(resObj)
    if (!resObj.success || !resObj) {
      useErrorHandler().handleError(resObj)
      return {} as Team
    }
    return resObj.team
  }
  async deleteTeam(id: string): Promise<void> {
    const url = `${BACKEND_URL}/api/teams/${id}`
    const token = AuthService.getToken()

    const requestOptions = {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
    const response = await fetch(url, requestOptions)

    const resObj = await response.json()
    console.log(resObj)
    if (!resObj.success || !resObj) {
      return useErrorHandler().handleError(resObj)
    }
    return resObj.team
  }
  async createTeam(
    teamName: string,
    teamDesc: string,
    teamMembers: Partial<Member>[]
  ): Promise<Team> {
    const ownerAddressStore = useOwnerAddressStore()
    const token = AuthService.getToken()
    const teamObject = {
      name: teamName,
      description: teamDesc,
      members: {
        createMany: {
          data: teamMembers
        }
      },
      address: ownerAddressStore.ownerAddress
    }

    const url = `${BACKEND_URL}/api/teams`
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` // Include Authorization header here
      },
      body: JSON.stringify(teamObject)
    }

    for (const member of teamMembers) {
      if (!isAddress(String(member.walletAddress))) {
        useErrorHandler().handleError(new Error(`Invalid wallet address`))
        return {} as Team
      }
    }

    const response = await fetch(url, requestOptions)

    const resObj = await response.json()
    if (!resObj.success) {
      useErrorHandler().handleError(resObj)
      return {} as Team
    }
    return resObj.team
  }
}
