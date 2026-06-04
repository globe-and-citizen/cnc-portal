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
