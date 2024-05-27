import { useFetch } from '@vueuse/core'
import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'

export class BaseAPI {
  protected async request(
    endpoint: string,
    method: string,
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<any> {
    const token = AuthService.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...additionalHeaders
    }

    const url = `${BACKEND_URL}${endpoint}`
    const requestOptions: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    }

    const { data, error } = await useFetch(url, requestOptions).json()

    if (error.value) {
      throw new Error(error.value.message || 'An error occurred')
    }

    const resObj = data.value
    if (resObj.success === false) {
      throw new Error(resObj.message || 'An error occurred')
    }

    return resObj
  }
}

export default BaseAPI
