import { apiFetch } from '~/lib/fetch'

/**
 * Authenticate with SIWE by sending message and signature to backend
 */
export const authenticateWithSiwe = (message: string, signature: string) => {
  return apiFetch<{ accessToken: string }>('/auth/siwe', {
    method: 'POST',
    body: { message, signature }
  })
}

/**
 * Validate current authentication token
 */
export const validateToken = (token: string) => {
  return apiFetch('/auth/token', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}
