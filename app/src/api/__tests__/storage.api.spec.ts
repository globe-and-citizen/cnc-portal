import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getFileUrlApi } from '../storage.api'
import apiClient from '@/lib/axios'

describe('getFileUrlApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

 

  it('should fetch file URL with both key and expiresIn parameters', async () => {
    const mockResponse = {
      url: 'https://example.com/signed-url-custom',
      expiresIn: 7200
    }

    vi.mocked(apiClient.get).mockResolvedValue({ data: mockResponse })

    const result = await getFileUrlApi('file-key-456', 7200)

    expect(result).toEqual(mockResponse)
    expect(apiClient.get).toHaveBeenCalledOnce()
    expect(apiClient.get).toHaveBeenCalledWith('/file/url', {
      params: {
        key: 'file-key-456',
        expiresIn: 7200
      }
    })
  })

  
  it('should return response with correct structure (url and expiresIn)', async () => {
    const mockResponse = {
      url: 'https://cdn.example.com/files/document.pdf?token=abc123',
      expiresIn: 1800
    }

    vi.mocked(apiClient.get).mockResolvedValue({ data: mockResponse })

    const result = await getFileUrlApi('document-key')

    expect(result).toHaveProperty('url')
    expect(result).toHaveProperty('expiresIn')
    expect(typeof result.url).toBe('string')
    expect(typeof result.expiresIn).toBe('number')
  })

})
