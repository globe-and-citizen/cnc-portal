import { describe, it, expect, vi } from 'vitest'
import { FetchMemberAPI } from '../memberApi'
import { AuthService } from '@/services/authService'

vi.mock('@/services/authService')

describe('FetchMemberAPI', () => {
  const fetchMemberAPI: FetchMemberAPI = new FetchMemberAPI()

  describe('createMembers', () => {
    it('throws an error if token is null', async () => {
      vi.spyOn(AuthService, 'getToken').mockReturnValue(null)
      await expect(
        fetchMemberAPI.createMembers(
          [{ name: 'John', walletAddress: '0xc542BdA5EC1aC9b86fF470c04062D6a181e67928' }],
          '123'
        )
      ).rejects.toThrow('Token is null')
    })

    it('throws an error if wallet address is invalid', async () => {
      vi.spyOn(AuthService, 'getToken').mockReturnValue('token')
      await expect(
        fetchMemberAPI.createMembers([{ name: 'John', walletAddress: '0x89238' }], '123')
      ).rejects.toThrow('Invalid wallet address')
    })
  })
})
