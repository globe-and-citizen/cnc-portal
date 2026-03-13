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

  it('caches presigned URL and reuses cached value', async () => {
    mockGetFileUrlApi.mockResolvedValue({ url: 'https://signed.example/file', expiresIn: 3600 })

    const first = await getPresignedUrl('file-key')
    const second = await getPresignedUrl('file-key')

    expect(first).toBe('https://signed.example/file')
    expect(second).toBe('https://signed.example/file')
    expect(mockGetFileUrlApi).toHaveBeenCalledTimes(1)
    expect(mockGetFileUrlApi).toHaveBeenCalledWith('file-key')
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
