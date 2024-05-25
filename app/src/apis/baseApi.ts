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
    const requestOptions: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, requestOptions)
    const resObj = await response.json()

    if (!response.ok) {
      throw new Error(resObj.message || 'An error occurred')
    }

    return resObj
  }
}

export default BaseAPI
