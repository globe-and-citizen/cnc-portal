import type { Team, Member } from '@/types'
import { AuthService } from '@/services/authService'
import { AuthAPI } from '@/apis/authApi'
import { BACKEND_URL } from '@/constant/index'
import { isAddress } from 'ethers' // ethers v6

interface TeamAPI {
  getAllTeams(): Promise<Team[]>
  getTeam(id: string): Promise<Team | null>
  updateTeam(id: string, updatedTeamData: Partial<Team>): Promise<Team>
  deleteTeam(id: string): Promise<void>
  createTeam(teamName: string, teamDesc: string, teamMembers: Partial<Member>[]): Promise<Team>
  deleteMember(id: string, address: string): Promise<void>
  createMembers(newMembers: Member[], id: string): Promise<Member[]>
}

export class FetchTeamAPI implements TeamAPI {
  async getAllTeams(): Promise<Team[]> {
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }
    const requestOptions = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/teams`, requestOptions)
    const resObj = await response.json()
    if (response.status === 401) {
      await AuthAPI.verifyToken(token)
      throw new Error(resObj.message)
    }
    if (!resObj.success) {
      throw new Error(resObj.message)
    }

    return resObj.teams
  }
  async getTeam(id: string): Promise<Team | null> {
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }
    const url = `${BACKEND_URL}/api/teams/${id}`
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
  async updateTeam(id: string, updatedTeamData: Partial<Team>): Promise<Team> {
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }

    const url = `${BACKEND_URL}/api/teams/${id}`
    const requestData = {
      ...updatedTeamData // Spread the updated team data
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
      throw new Error(resObj.message)
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
    if (!resObj.success || !resObj) {
      throw new Error(resObj.message)
    }

    return resObj.team
  }
  async createTeam(
    teamName: string,
    teamDesc: string,
    teamMembers: Partial<Member>[]
  ): Promise<Team> {
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }
    const teamObject = {
      name: teamName,
      description: teamDesc,
      members: teamMembers
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
      if (!isAddress(String(member.address))) {
        throw new Error(`Invalid wallet address`)
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
  async deleteMember(id: string, address: string): Promise<void> {
    const token: string | null = AuthService.getToken()

    if (!token) {
      throw new Error('Token is null')
    }
    const requestOptions = {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        memberaddress: address
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/teams/${id}/member`, requestOptions)
    const resObj = await response.json()
    if (response.status === 401) {
      throw new Error(resObj.message)
    }
    if (!resObj.success) {
      throw new Error(resObj)
    }
    console.log(resObj)
    return resObj.team
  }
  async createMembers(newMembers: Partial<Member>[], id: string): Promise<Member[]> {
    const token: string | null = AuthService.getToken()
    if (!token) {
      throw new Error('Token is null')
    }

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ data: newMembers })
    }

    for (const member of newMembers) {
      if (!isAddress(member.address)) {
        throw new Error(`Invalid wallet address`)
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/teams/${id}/member`, requestOptions)
    const resObj = await response.json()
    if (response.status === 401) {
      throw new Error(resObj.message)
    }
    if (!resObj.success) {
      throw new Error(resObj.message)
    }
    return resObj.members
  }
}
