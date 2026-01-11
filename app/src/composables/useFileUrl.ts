/**
 * Composable for fetching presigned URLs for files stored in S3/Railway Storage.
 * Handles caching to avoid repeated API calls for the same file.
 */
import { ref } from 'vue'
import { BACKEND_URL } from '@/constant/index'
import { useStorage } from '@vueuse/core'

// Cache for presigned URLs (key -> { url, expiresAt })
interface CachedUrl {
  url: string
  expiresAt: number // timestamp
}

const urlCache = new Map<string, CachedUrl>()

// Cache duration: 50 minutes (presigned URLs are valid for 1 hour by default)
const CACHE_DURATION_MS = 50 * 60 * 1000

/**
 * Fetch a presigned URL for a file stored in S3/Railway Storage
 * @param key - The S3 object key (file path in storage)
 * @returns The presigned URL or null if fetch fails
 */
export async function getPresignedUrl(key: string): Promise<string | null> {
  if (!key) return null

  // Check cache first
  const cached = urlCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url
  }

  try {
    const authToken = useStorage('authToken', '')
    const response = await fetch(`${BACKEND_URL}/api/file/url?key=${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch presigned URL:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    const url = data.url

    if (url) {
      // Cache the URL
      urlCache.set(key, {
        url,
        expiresAt: Date.now() + CACHE_DURATION_MS
      })
    }

    return url || null
  } catch (error) {
    console.error('Error fetching presigned URL:', error)
    return null
  }
}

/**
 * Composable to manage file URL fetching with reactive state
 */
export function useFileUrl() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Get a presigned URL for a file
   * @param key - The S3 object key
   * @returns The presigned URL
   */
  async function fetchUrl(key: string): Promise<string | null> {
    loading.value = true
    error.value = null

    try {
      const url = await getPresignedUrl(key)
      if (!url) {
        error.value = 'Failed to fetch file URL'
      }
      return url
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear the URL cache
   */
  function clearCache() {
    urlCache.clear()
  }

  return {
    loading,
    error,
    fetchUrl,
    clearCache,
    getPresignedUrl
  }
}

export default useFileUrl
