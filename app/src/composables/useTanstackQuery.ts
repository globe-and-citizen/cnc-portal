import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { unref, type Ref } from 'vue'
import { BACKEND_URL } from '@/constant'
import { useAuthToken } from '@/composables/useAuthToken'

export function useTanstackQuery<T = unknown>(
  key: string | unknown[] | Ref<string | unknown[]>,
  url: string | Ref<string>,
  options?: UseQueryOptions<T>
) {
  const token = useAuthToken()
  const fetcher = async (): Promise<T> => {
    const endpoint = unref(url)
    const res = await fetch(`${BACKEND_URL}/api${endpoint}`, {
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      },
      credentials: 'include'
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }
  const rawKey = unref(key)
  const queryKey = Array.isArray(rawKey) ? rawKey : [rawKey]
  return useQuery<T>({
    queryKey,
    queryFn: fetcher,
    ...(options || {})
  })
}
