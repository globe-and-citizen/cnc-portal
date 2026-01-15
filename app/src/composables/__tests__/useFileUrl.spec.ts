import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFileUrl, getPresignedUrl } from '../useFileUrl'

vi.mock('@vueuse/core', () => ({
  useStorage: vi.fn(() => ({ value: 'token-123' }))
}))

vi.mock('@/constant/index', () => ({
  BACKEND_URL: 'https://api.example.com'
}))

describe('useFileUrl', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
    const { clearCache } = useFileUrl()
    clearCache()
  })

  it('caches presigned URL and reuses cached value', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ url: 'https://signed.example/file' })
    })

    const first = await getPresignedUrl('file-key')
    const second = await getPresignedUrl('file-key')

    expect(first).toBe('https://signed.example/file')
    expect(second).toBe('https://signed.example/file')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/file/url?key=file-key', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json'
      }
    })
  })

  it('returns null and logs when backend responds with error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error'
    })

    const result = await getPresignedUrl('file-key')

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch presigned URL:', 500, 'Server Error')
    consoleSpy.mockRestore()
  })

  it('sets error state when URL cannot be fetched', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ url: null })
    })

    const { fetchUrl, error, loading } = useFileUrl()
    const result = await fetchUrl('missing-key')

    expect(result).toBeNull()
    expect(error.value).toBe('Failed to fetch file URL')
    expect(loading.value).toBe(false)
  })

  it('handles fetch rejection gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockRejectedValue(new Error('network down'))

    const { fetchUrl, error } = useFileUrl()
    const result = await fetchUrl('file-key')

    expect(result).toBeNull()
    expect(error.value).toBe('Failed to fetch file URL')
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching presigned URL:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})
