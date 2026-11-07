import apiClient from '@/lib/axios'

export interface SiweAuthBody {
  message: string
  signature: string
}

export interface SiweAuthResponse {
  accessToken: string
}

/**
 * Exchange a signed SIWE message for a JWT access token.
 *
 * Plain async wrapper — used by `useSiweMutation` to keep the orchestration
 * inside a single TanStack mutation rather than nesting one mutation in
 * another.
 */
export const siweAuth = async (body: SiweAuthBody): Promise<SiweAuthResponse> => {
  const { data } = await apiClient.post<SiweAuthResponse>('auth/siwe', body)
  return data
}

/** Verify the exact token being restored before entering a protected route. */
export const validateToken = async (token: string): Promise<void> => {
  await apiClient.get('auth/token', {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000
  })
}
