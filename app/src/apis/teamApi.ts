import type { Team, Member } from '@/types/types'
import { useOwnerAddressStore } from '@/stores/address'
import { AuthService } from '@/services/authService'
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

    console.log(token)
    const requestOptions = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }

    try {
      const response = await fetch('http://localhost:3000/api/teams', requestOptions)

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
    const url = `http://localhost:3000/api/teams/${id}`
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` // Include Authorization header here
      },
      body: JSON.stringify({
        address: ownerAddressStore.getOwnerAddress()
      })
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

    const url = `http://localhost:3000/api/teams/${id}`
    const requestData = {
      ...updatedTeamData, // Spread the updated team data
      address: ownerAddressStore.getOwnerAddress() // Add the owner address
    }
    const requestOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      Authorization: `Bearer ${AuthService.getToken()}`,
      body: JSON.stringify(requestData)
    }

    try {
      const response = await fetch(url, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const updatedTeam: Team = await response.json()
      return updatedTeam
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }
  async deleteTeam(id: string): Promise<void> {
    const url = `http://localhost:3000/api/teams/${id}`
    const requestOptions = {
      method: 'DELETE',
      Authorization: `Bearer ${AuthService.getToken()}`
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
    console.log('Tolem', token, 'Store', ownerAddressStore.getOwnerAddress())
    const teamObject = {
      name: teamName,
      description: teamDesc,
      members: {
        createMany: {
          data: teamMembers
        }
      },
      address: ownerAddressStore.getOwnerAddress()
    }

    const url = 'http://localhost:3000/api/teams'
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` // Include Authorization header here
      },
      body: JSON.stringify(teamObject)
    }

    try {
      const response = await fetch(url, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const createdTeam: Team = await response.json()
      return createdTeam
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }
}
