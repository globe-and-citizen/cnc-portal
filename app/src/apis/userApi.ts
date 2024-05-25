import { type User, ToastType } from '@/types/index'
import { useToastStore } from '@/stores/toast'
import { BaseAPI } from '@/apis/baseApi'

// Define an interface for UserService
interface UserAPI {
  getUser(address: string): Promise<User>
  createUser(user: User): Promise<User>
  updateUser(updatedUser: Partial<User>): Promise<User>
}

// Implement UserService using Fetch API (or any other HTTP client)
export class FetchUserAPI extends BaseAPI implements UserAPI {
  async getUser(address: string): Promise<User> {
    const resObj = await this.request(`/api/user/${address}`, 'GET')

    return resObj.user
  }

  async createUser(user: User): Promise<User> {
    const resObj = await this.request(`/api/user/${user.id}`, 'POST', user)

    return resObj.user
  }

  async updateUser(updatedUser: Partial<User>): Promise<User> {
    const { show } = useToastStore()

    const resObj = await this.request(`/api/user/${updatedUser.address}`, 'PUT', updatedUser)
    console.log(resObj)
    // show(ToastType.Success, 'User updated successfully')
    return resObj.user
  }

  async getNonce(userId: string): Promise<string> {
    const resObj = await this.request(`/api/user/nonce/${userId}`, 'GET')

    return resObj.nonce
  }
}
