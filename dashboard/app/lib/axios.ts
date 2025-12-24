import axios from 'axios'

const runtimeConfig = useRuntimeConfig()
const backendUrl = runtimeConfig.public.backendUrl

const apiClient = axios.create({
  baseURL: `${backendUrl}/api/`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  const token = authStore.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  (error) => {
    // Handle 401 errors globally if needed
    if (error.response?.status === 401) {
      // Will be handled by individual queries if needed
      console.warn('Unauthorized request detected')
    }
    return Promise.reject(error)
  }
)

export default apiClient
