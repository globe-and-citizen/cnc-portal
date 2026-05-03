import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getUser, getUserNonce } from '../user.api'
import apiClient from '@/lib/axios'

describe('user.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserNonce', () => {
    it('GETs /user/nonce/:address and returns the nonce payload', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { nonce: 'abcdef1234' } })

      const result = await getUserNonce('0xdeadbeef00000000000000000000000000000000')

      expect(apiClient.get).toHaveBeenCalledWith(
        'user/nonce/0xdeadbeef00000000000000000000000000000000'
      )
      expect(result).toEqual({ nonce: 'abcdef1234' })
    })

    it('propagates axios errors', async () => {
      const err = new Error('boom')
      vi.mocked(apiClient.get).mockRejectedValue(err)

      await expect(getUserNonce('0xdeadbeef00000000000000000000000000000000')).rejects.toBe(err)
    })
  })

  describe('getUser', () => {
    it('GETs /user/:address and returns the user payload', async () => {
      const user = { address: '0xabc', name: 'Alice', nonce: 'n', imageUrl: '' }
      vi.mocked(apiClient.get).mockResolvedValue({ data: user })

      const result = await getUser('0xabc0000000000000000000000000000000000000')

      expect(apiClient.get).toHaveBeenCalledWith('user/0xabc0000000000000000000000000000000000000')
      expect(result).toEqual(user)
    })
  })
})
