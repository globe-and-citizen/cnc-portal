import type { ISiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
import type { IWeb3Library } from '@/adapters/web3LibraryAdapter'
import type { IAuthAPI } from '@/apis/authApi'

// Define a generic type for credentials
type AuthCredentials<T> = T | undefined | {}

// Define an interface for AuthService
interface IAuthService<T> {
  authenticateUser(credentials: AuthCredentials<T>): Promise<string>
  isAuthenticated(): boolean
  logout(): void
}

//Abstract class providing default implementations for isAuthenticated and logout
abstract class AuthService<T> implements IAuthService<T> {
  abstract authenticateUser(credentials: AuthCredentials<T>): Promise<string>

  isAuthenticated(): boolean {
    // Default implementation for isAuthenticated
    // Check if the authentication token is present in local storage
    return localStorage.getItem('authToken') !== null
  }

  logout(): void {
    // Default implementation for logout
    // Remove the authentication token from local storage
    localStorage.removeItem('authToken')
  }
}

// Implement SIWE authentication
export class SIWEAuthService extends AuthService<{ signature: string }> {
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
    const token = await this.authAPI.verifyPayloadAndGetToken(signature, 'siwe')
    localStorage.setItem('authToken', token)

    return token // For demonstration purposes only
  }
}

// Implement Email/Password authentication
export class EmailPasswordAuthService extends AuthService<{ email: string; password: string }> {
  async authenticateUser(
    credentials: AuthCredentials<{ email: string; password: string }>
  ): Promise<string> {
    // Implementation of email/password authentication
    const { email, password } = credentials
    // Authentication logic using email and password
    return 'example_token' // For demonstration purposes only
  }
}

// Implement ECDSA authentication
export class ECDSAAuthService extends AuthService<{ signature: string }> {
  async authenticateUser(credentials: AuthCredentials<{ signature: string }>): Promise<string> {
    // Implementation of ECDSA authentication
    const { signature } = credentials
    // Authentication logic using ECDSA signature
    return 'example_token' // For demonstration purposes only
  }
}

// Implement other authentication
// Similar to EmailPasswordAuthService and ECDSAAuthService...
