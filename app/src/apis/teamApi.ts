import type { Team, Member } from '@/types'
import { useOwnerAddressStore } from '@/stores/address'
import { AuthService } from '@/services/authService'
import { AuthAPI } from '@/apis/authApi'
import { BACKEND_URL } from '@/constant/index'
import { isAddress } from 'ethers' // ethers v6

export interface TeamAPI {
  getAllTeams(): Promise<Team[]>
  getTeam(id: string): Promise<Team | null>
  updateTeam(id: string, updatedTeamData: Partial<Team>): Promise<Team>
  deleteTeam(id: string): Promise<void>
  createTeam(teamName: string, teamDesc: string, teamMembers: Partial<Member>[]): Promise<Team>
}

export class FetchTeamAPI implements TeamAPI {
  async getAllTeams(): Promise<Team[]> {
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }
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
    if (response.status === 401) {
      await AuthAPI.verifyToken(token)
      throw new Error('Unauthorized')
    }
    if (!resObj.success) {
      throw new Error(resObj.message)
    }

    return resObj.teams
  }
  async getTeam(id: string): Promise<Team | null> {
    const ownerAddressStore = useOwnerAddressStore()
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }
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
    if (response.status === 401) {
      await AuthAPI.verifyToken(token)
      throw new Error('Unauthorized')
    }
    if (!resObj.success) {
      throw new Error(resObj.message)
    }

    return resObj.team
  }
  async updateTeam(id: string, updatedTeamData: Partial<Team>): Promise<Team> {
    const ownerAddressStore = useOwnerAddressStore()
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }

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
    if (response.status === 401) {
      await AuthAPI.verifyToken(token)
      throw new Error('Unauthorized')
    }
    if (!resObj.success || !resObj) {
      throw new Error(resObj.message)
    }
    return resObj.team
  }
  async deleteTeam(id: string): Promise<void> {
    const url = `${BACKEND_URL}/api/teams/${id}`
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
    const response = await fetch(url, requestOptions)

    const resObj = await response.json()
    if (response.status === 401) {
      await AuthAPI.verifyToken(token)
      throw new Error('Unauthorized')
    }
    if (!resObj.success || !resObj) {
      throw new Error(resObj.message)
    }
    if (resObj.team.count == 0) {
      throw new Error('Team not deleted')
    }
    return resObj.team
  }
  async createTeam(
    teamName: string,
    teamDesc: string,
    teamMembers: Partial<Member>[]
  ): Promise<Team> {
    const ownerAddressStore = useOwnerAddressStore()
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }
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
        throw new Error(`Invalid wallet address`)
      }
    }

    const response = await fetch(url, requestOptions)

    const resObj = await response.json()
    if (response.status === 401) {
      await AuthAPI.verifyToken(token)
      throw new Error('Unauthorized')
    }
    if (!resObj.success) {
      throw new Error(resObj.message)
    }
    return resObj.team
  }
}
