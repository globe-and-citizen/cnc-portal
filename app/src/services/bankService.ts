import { FetchTeamAPI, type TeamAPI } from '@/apis/teamApi'

interface IBankService {
  teamApi: TeamAPI
  createBankContract(id: string): Promise<string>
}

export class BankService implements IBankService {
  teamApi: TeamAPI

  constructor() {
    this.teamApi = new FetchTeamAPI()
  }

  async createBankContract(teamId: string): Promise<string> {
    try {
      // TODO: change to actual deploy contract
      const bankAddress = '0x107AdA61975827b641A4BfdE72fC4d34B7CB883F'

      const response = await this.teamApi.updateTeam(teamId, {
        bankAddress
      })

      return response.bankAddress!
    } catch (error) {
      console.log(error)

      throw new Error('Failed to create bank contract')
    }
  }
}
