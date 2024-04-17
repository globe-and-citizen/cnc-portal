import { BACKEND_URL } from "@/utils/util";

// Define a generic type for user data
interface User {
  id?: string
  name?: string
  surname?: string
  nonce?: string
  // Other user properties...
}

// Define an interface for UserService
interface UserAPI {
  getUser(userId: string): Promise<User>
  createUser(user: User): Promise<User>
  updateUser(userId: number, updatedUser: Partial<User>): Promise<User>
}

// Implement UserService using Fetch API (or any other HTTP client)
export class FetchUserAPI implements UserAPI {
  async getUser(userId: string): Promise<User> {
    //const response = await fetch(`https://api.example.com/users/${userId}`);
    const userData = /*await response.json()*/ {}
    return userData
  }

  async createUser(user: User): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/api/user/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });
    const createdUser = await response.json(); /*{ nonce: `JdqIpQPlVJ0Jyv6yu` }*/
    return createdUser
  }

  async updateUser(userId: number, updatedUser: Partial<User>): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedUser)
    })
    const updatedUserData = await response.json()
    return updatedUserData
  }

  async getNonce(userId: string): Promise<string> {
    const response = await fetch(`${BACKEND_URL}/api/user/nonce/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    })

    const resObj = await response.json()

    if (resObj.success) {
      const { nonce } = resObj
      return nonce
    } else {
      throw new Error(resObj.message)
    }
  }
}
