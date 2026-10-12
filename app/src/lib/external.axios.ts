import axios, { type AxiosError } from 'axios'

/**
 * Generic external API client without base URL
 * Useful for dynamic external API calls with full URLs
 */
const externalApiClient = axios.create({
  timeout: 15000, // Longer timeout for external services
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
  // validateStatus: (status) => status < 500 // Don't throw on 4xx errors
})

externalApiClient.interceptors.request.use((request) => {
  const target = new URL(request.url!, request.baseURL)
  const key = import.meta.env.VITE_APP_SAFE_API_KEY?.trim()
  if (
    request.method === 'get' &&
    key &&
    target.origin === 'https://api.safe.global' &&
    target.pathname.startsWith('/tx-service/')
  ) {
    request.headers.set('Authorization', `Bearer ${key}`)
  }
  return request
})

externalApiClient.interceptors.response.use(undefined, (error: AxiosError) => {
  // Query consumers can log errors without exposing request credentials.
  if (error.config?.headers) {
    delete error.config.headers.Authorization
    delete error.config.headers.authorization
  }
  return Promise.reject(error)
})

export default externalApiClient
