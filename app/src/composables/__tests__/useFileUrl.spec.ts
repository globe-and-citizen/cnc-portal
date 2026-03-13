import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFileUrl, getPresignedUrl } from '../useFileUrl'

const mockGetFileUrlApi = vi.fn()

vi.mock('@/api', () => ({
  getFileUrlApi: (...args: unknown[]) => mockGetFileUrlApi(...args)
}))

describe('useFileUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { clearCache } = useFileUrl()
    clearCache()
  })

  it('returns null for empty key', async () => {
    const result = await getPresignedUrl('')
    expect(result).toBeNull()
    expect(mockGetFileUrlApi).not.toHaveBeenCalled()
  })

  it('caches presigned URL and reuses cached value', async () => {
    mockGetFileUrlApi.mockResolvedValue({ url: 'https://signed.example/file', expiresIn: 3600 })

    const first = await getPresignedUrl('file-key')
    const second = await getPresignedUrl('file-key')

    expect(first).toBe('https://signed.example/file')
    expect(second).toBe('https://signed.example/file')
    expect(mockGetFileUrlApi).toHaveBeenCalledTimes(1)
    expect(mockGetFileUrlApi).toHaveBeenCalledWith('file-key')
  })

  it('re-fetches when cached URL has expired', async () => {
    mockGetFileUrlApi.mockResolvedValue({ url: 'https://signed.example/file-v1', expiresIn: 3600 })
    await getPresignedUrl('expiring-key')

    // Advance time past cache duration (50 minutes)
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 51 * 60 * 1000)

    mockGetFileUrlApi.mockResolvedValue({ url: 'https://signed.example/file-v2', expiresIn: 3600 })
    const result = await getPresignedUrl('expiring-key')

    expect(result).toBe('https://signed.example/file-v2')
    expect(mockGetFileUrlApi).toHaveBeenCalledTimes(2)
    vi.restoreAllMocks()
  })

  it('returns null and logs when API call fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetFileUrlApi.mockRejectedValue(new Error('Request failed with status code 500'))

    const result = await getPresignedUrl('file-key')

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching presigned URL:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('sets error state when URL cannot be fetched', async () => {
    mockGetFileUrlApi.mockResolvedValue({ url: null, expiresIn: 3600 })

    const { fetchUrl, error, loading } = useFileUrl()
    const result = await fetchUrl('missing-key')

    expect(result).toBeNull()
    expect(error.value).toBe('Failed to fetch file URL')
    expect(loading.value).toBe(false)
  })

  it('fetchUrl returns URL and clears error on success', async () => {
    mockGetFileUrlApi.mockResolvedValue({ url: 'https://signed.example/file', expiresIn: 3600 })

    const { fetchUrl, error, loading } = useFileUrl()
    const result = await fetchUrl('file-key')

    expect(result).toBe('https://signed.example/file')
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('handles API rejection gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetFileUrlApi.mockRejectedValue(new Error('network down'))

    const { fetchUrl, error } = useFileUrl()
    const result = await fetchUrl('file-key')

    expect(result).toBeNull()
    expect(error.value).toBe('Failed to fetch file URL')
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching presigned URL:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})
