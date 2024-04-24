import type { Team, Member } from '@/types/types'
import { useOwnerAddressStore } from '@/stores/address'
import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'
import { useToastStore } from '@/stores/toast'
import { ToastType } from '@/types'
import { isAddress } from 'ethers' // ethers v6

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

    try {
      const response = await fetch(`${BACKEND_URL}/api/teams`, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const teamsData = await response.json()
      return teamsData
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
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

    try {
      const response = await fetch(url, requestOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const teamData = await response.json()
      return teamData
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
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

    try {
      const response = await fetch(url, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const updatedTeam: Team = await response.json()
      return updatedTeam
    } catch (error: any) {
      const { show } = useToastStore()
      show(ToastType.Warning, error.message)
      console.error('Error:', error)
      throw error
    }
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

    try {
      const response = await fetch(url, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      return
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
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
    const { show } = useToastStore()

    try {
      teamMembers.map((member) => {
        if (!isAddress(String(member.walletAddress))) {
          throw new Error(`Invalid wallet address`)
        }
      })
      const response = await fetch(url, requestOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      show(ToastType.Success, 'Successfully added team')
      const createdTeam: Team = await response.json()
      return createdTeam
    } catch (error: any) {
      show(ToastType.Warning, error.message)
      console.error('Error:', error.message)
      throw error
    }
  }
}
