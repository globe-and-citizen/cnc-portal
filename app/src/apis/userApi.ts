// Define a generic type for user data
interface User {
    id?: string;
    name?: string;
    surname?: string;
    nonce?: string;
    // Other user properties...
}
  
  // Define an interface for UserService
  interface UserAPI {
    getUser(userId: string): Promise<User>;
    createUser(user: User): Promise<User>;
    updateUser(userId: number, updatedUser: Partial<User>): Promise<User>;
  }
  
  // Implement UserService using Fetch API (or any other HTTP client)
  export class FetchUserAPI implements UserAPI {
    async getUser(userId: string): Promise<User> {
      //const response = await fetch(`https://api.example.com/users/${userId}`);
      const userData = /*await response.json()*/{};
      return userData;
    }
  
    async createUser(user: User): Promise<User> {
      /*const response = await fetch(`https://api.example.com/users/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });*/
      const createdUser = /*await response.json();*/ {nonce: `JdqIpQPlVJ0Jyv6yu`}
      return createdUser;
    }
  
    async updateUser(userId: number, updatedUser: Partial<User>): Promise<User> {
      const response = await fetch(`https://api.example.com/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser),
      });
      const updatedUserData = await response.json();
      return updatedUserData;
    }
  }
  