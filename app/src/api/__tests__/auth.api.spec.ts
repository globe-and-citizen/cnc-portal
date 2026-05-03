import { describe, it, expect, beforeEach, vi } from 'vitest'
import { siweAuth } from '../auth.api'
import apiClient from '@/lib/axios'

describe('auth.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('siweAuth', () => {
    it('POSTs /auth/siwe with the SIWE body and returns the access token', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { accessToken: 'jwt.token' } })

      const result = await siweAuth({ message: 'siwe message', signature: '0xsig' })

      expect(apiClient.post).toHaveBeenCalledWith('auth/siwe', {
        message: 'siwe message',
        signature: '0xsig'
      })
      expect(result).toEqual({ accessToken: 'jwt.token' })
    })

    it('propagates axios errors', async () => {
      const err = Object.assign(new Error('unauthorized'), { response: { status: 401 } })
      vi.mocked(apiClient.post).mockRejectedValue(err)

      await expect(siweAuth({ message: 'm', signature: 's' })).rejects.toBe(err)
    })
  })
})
