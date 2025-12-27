/**
 * API User type definition for dashboard
 * Represents a user in the CNC Portal system with Ethereum address and roles
 */
export interface ApiUser {
  id?: string
  address: string
  name?: string
  imageUrl?: string
  roles: string[]
  nonce?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * User update payload for profile updates
 */
export interface UpdateUserPayload {
  name?: string
  imageUrl?: string
}

/**
 * Paginated users response from API
 */
export interface UsersResponse {
  users: ApiUser[]
  totalUsers: number
  currentPage: number
  totalPages: number
}

/**
 * User nonce response for SIWE authentication
 */
export interface NonceResponse {
  success: boolean
  nonce: string
}

/**
 * User roles
 */
export enum UserRole {
  ROLE_USER = 'ROLE_USER',
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_SUPER_ADMIN = 'ROLE_SUPER_ADMIN'
}
