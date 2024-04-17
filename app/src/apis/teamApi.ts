import type { Team, Member } from '@/types/types'

interface TeamAPI {
  getAllTeams(): Promise<Team[]>
  getTeam(id: string): Promise<Team | null>
  updateTeam(id: string, updatedTeamData: Partial<Team>): Promise<Team>
  deleteTeam(id: string): Promise<void>
  createTeam(teamName: string, teamDesc: string, teamMembers: Partial<Member>[]): Promise<Team>
}

export class FetchTeamAPI implements TeamAPI {
  async getAllTeams(): Promise<Team[]> {
    const requestOptions = {
      method: 'GET'
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
    const url = `http://localhost:3000/api/teams/${id}`
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: 'user_address_321'
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
    const url = `http://localhost:3000/api/teams/${id}`
    const requestOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedTeamData)
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
      method: 'DELETE'
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
    const teamObject = {
      name: teamName,
      description: teamDesc,
      members: {
        createMany: {
          data: teamMembers
        }
      },
      address: 'user_address_321'
    }

    const url = 'http://localhost:3000/api/teams'
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
