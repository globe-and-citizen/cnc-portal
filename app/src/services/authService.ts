import type { ISiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
import type { IWeb3Library } from '@/adapters/web3LibraryAdapter'
import type { IAuthAPI } from '@/apis/authApi'
import { AuthAPI } from '@/apis/authApi'
import { useStorage } from '@vueuse/core'

// Define a generic type for credentials
type AuthCredentials<T> = T | undefined | {}

// Define an interface for AuthService
interface IAuthService<T> {
  authenticateUser(credentials: AuthCredentials<T>): Promise<string>
}

//Class providing default implementations for auth service
export class AuthService {
  static async isAuthenticated(): Promise<boolean> {
    const token = this.getToken()

    if (token !== null) return await AuthAPI.verifyToken(token)

    return false
  }

  static logout(): void {
    const token = useStorage('authToken', null)
    token.value = null
  }

  static getToken(): string | null {
    const token = useStorage('authToken', null)

    return token.value
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
    const token = await this.authAPI.verifyPayloadAndGetToken({ signature, message }, 'siwe')
    useStorage('authToken', token)

    return token // For demonstration purposes only
  }
}

// Implement other authentication
// Similar to EmailPasswordAuthService and ECDSAAuthService...
