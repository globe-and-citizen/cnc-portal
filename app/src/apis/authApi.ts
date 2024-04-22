import { BACKEND_URL } from '@/constant/index'
import { logout } from '@/utils/navBarUtil'
export interface IAuthAPI {
  verifyPayloadAndGetToken(payload: any, methodDetails: any): Promise<string>
}

export class AuthAPI {
  static async verifyToken(token: string): Promise<boolean> {
    const response = await fetch(`${BACKEND_URL}/api/auth/token`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const resObj = await response.json()

    if (resObj.success) {
      return true
    } else {
      //return false
      logout()
      throw new Error(resObj.message)
    }
  }
}

export class SiweAuthAPI extends AuthAPI implements IAuthAPI {
  /*private httpClient: HttpClient;
  
    constructor(httpClient: HttpClient) {
      this.httpClient = httpClient;
    }*/

  async verifyPayloadAndGetToken(payload: any, methodDetails: any): Promise<string> {
    // Make a call to an API endpoint
    const response = await fetch(`${BACKEND_URL}/api/auth/${methodDetails}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    const resObj = await response.json()

    if (resObj.success) {
      const { accessToken: token } = resObj // Assuming the response contains a token field
      return token
    } else {
      throw new Error(resObj.message)
    }
  }
}
