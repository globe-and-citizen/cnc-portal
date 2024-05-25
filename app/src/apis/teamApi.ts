import type { Team, Member } from '@/types'
import { useOwnerAddressStore } from '@/stores/address'
import { isAddress } from 'ethers' // ethers v6
import { BaseAPI } from '@/apis/baseApi'

interface TeamAPI {
  getAllTeams(): Promise<Team[]>
  getTeam(id: string): Promise<Team | null>
  updateTeam(id: string, updatedTeamData: Partial<Team>): Promise<Team>
  deleteTeam(id: string): Promise<void>
  createTeam(teamName: string, teamDesc: string, teamMembers: Partial<Member>[]): Promise<Team>
}

export class FetchTeamAPI extends BaseAPI implements TeamAPI {
  async getAllTeams(): Promise<Team[]> {
    const ownerAddressStore = useOwnerAddressStore()
    const resObj = await this.request(`/api/teams`, 'GET', undefined, {
      ownerAddress: ownerAddressStore.ownerAddress
    })

    return resObj.teams
  }

  async getTeam(id: string): Promise<Team | null> {
    const ownerAddressStore = useOwnerAddressStore()
    const resObj = await this.request(`/api/teams/${id}`, 'GET', undefined, {
      ownerAddress: ownerAddressStore.ownerAddress
    })

    return resObj.team
  }

  async updateTeam(id: string, updatedTeamData: Partial<Team>): Promise<Team> {
    const ownerAddressStore = useOwnerAddressStore()
    const requestData = {
      ...updatedTeamData,
      address: ownerAddressStore.ownerAddress
    }

    const resObj = await this.request(`/api/teams/${id}`, 'PUT', requestData)

    return resObj.team
  }

  async deleteTeam(id: string): Promise<void> {
    const resObj = await this.request(`/api/teams/${id}`, 'DELETE')

    return resObj.team
  }

  async createTeam(
    teamName: string,
    teamDesc: string,
    teamMembers: Partial<Member>[]
  ): Promise<Team> {
    const ownerAddressStore = useOwnerAddressStore()
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

    for (const member of teamMembers) {
      if (!isAddress(String(member.walletAddress))) {
        throw new Error(`Invalid wallet address`)
      }
    }

    const resObj = await this.request(`/api/teams`, 'POST', teamObject)

    return resObj.team
  }
}
