import axios from 'axios'

/**
 * Generic external API client without base URL
 * Useful for dynamic external API calls with full URLs
 */
const externalApiClient = axios.create({
  timeout: 15000, // Longer timeout for external services
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  },
  validateStatus: (status) => status < 500 // Don't throw on 4xx errors
})

export default externalApiClient
