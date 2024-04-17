import type { ISiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
import type { IWeb3Library } from '@/adapters/web3LibraryAdapter'
import type { IAuthAPI } from '@/apis/authApi'
import { AuthAPI } from '@/apis/authApi'

// Define a generic type for credentials
type AuthCredentials<T> = T | undefined | {}

// Define an interface for AuthService
interface IAuthService<T> {
  authenticateUser(credentials: AuthCredentials<T>): Promise<string>
}

//Class providing default implementations for auth service
class AuthService {
  static async isAuthenticated(): Promise<boolean> {
    const token = this.getToken()

    if (token !== null)
        return await AuthAPI.veryToken(token)

    return false
  }

  static logout(): void {
      localStorage.removeItem("authToken")
  }

  static getToken(): string | null {
      return localStorage.getItem("authToken")
  }
}

// Implement SIWE authentication
export class SIWEAuthService<T> extends AuthService implements IAuthService<T> {
  private messageCreator: ISiweMessageCreator
  private web3Library: IWeb3Library
  private authAPI: IAuthAPI

  constructor(messageCreator: ISiweMessageCreator, web3Library: IWeb3Library, authAPI: IAuthAPI) {
    super()
    this.messageCreator = messageCreator
    this.web3Library = web3Library
    this.authAPI = authAPI
  }

  async authenticateUser(): Promise<string> {
    // Authentication logic of SIWE authentication
    const message = await this.messageCreator.create()
    const signature = await this.web3Library.requestSign(message)
    const token = await this.authAPI.verifyPayloadAndGetToken({signature, message}, 'siwe')
    localStorage.setItem('authToken', token)

    return token // For demonstration purposes only
  }
}

// Implement other authentication
// Similar to EmailPasswordAuthService and ECDSAAuthService...
