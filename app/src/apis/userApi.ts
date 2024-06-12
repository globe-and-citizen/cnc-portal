import { BACKEND_URL } from '@/constant/index'

// Define a generic type for user data
import { type User, ToastType } from '@/types/index'
import { useToastStore } from '@/stores/useToastStore'

// Define an interface for UserService
interface UserAPI {
  getUser(address: string): Promise<User>
  createUser(user: User): Promise<User>
  updateUser(updatedUser: Partial<User>): Promise<User>
  searchUser(name: string, address: string): Promise<User[]>
}

// Implement UserService using Fetch API (or any other HTTP client)
export class FetchUserAPI implements UserAPI {
  async getUser(address: string): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/api/user/${address}`, {
      method: 'GET'
    })
    const userData = await response.json()
    return userData
  }

  async createUser(user: User): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/api/user/${user.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user)
    })
    const createdUser = await response.json() /*{ nonce: `JdqIpQPlVJ0Jyv6yu` }*/
    return createdUser
  }

  async updateUser(updatedUser: Partial<User>): Promise<User> {
    console.log('updatedUser', updatedUser)
    const address = updatedUser.address
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/${address}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedUser)
      })
      const updatedUserData = await response.json()
      const { addToast } = useToastStore()
      addToast({ type: ToastType.Success, message: 'User updated successfully', timeout: 5000 })
      return updatedUserData
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }

  async getNonce(userId: string): Promise<string> {
    const response = await fetch(`${BACKEND_URL}/api/user/nonce/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const resObj = await response.json()

    if (resObj.success) {
      const { nonce } = resObj
      return nonce
    } else {
      throw new Error(resObj.message)
    }
  }
  async searchUser(name: string, address: string): Promise<User[]> {
    const params = new URLSearchParams()
    if (!name && !address) return []
    if (name) params.append('name', name)
    if (address) params.append('address', address)

    const response = await fetch(`${BACKEND_URL}/api/user/search?${params.toString()}`, {
      method: 'GET'
    })
    const resObj = await response.json()
    if (response.status === 401) {
      throw new Error(resObj.message)
    }
    if (!resObj.success) {
      throw new Error(resObj.message)
    }
    return resObj.users
  }
}
