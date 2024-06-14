import { AuthService } from '@/services/authService'
//import { AuthAPI } from '@/apis/authApi'
import { BACKEND_URL } from "@/constant";
import { useUserDataStore } from "@/stores/user";

export class NotificationAPI {
    static async getNotifications () {
        const { address } = useUserDataStore()

        const token = AuthService.getToken()

        if (!token) {
            throw new Error("Token is not set or empty")
        }

        const requestOptions = {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }

        const response = await fetch(
            `${BACKEND_URL}/api/notification?userAddress=${address}`,
            requestOptions
        )

        const resObj = await response.json()

        if (resObj.success) {
            console.log("[apis][notificationApi][NotificationAPI][getNotifications] resObj: ", resObj)

            return resObj.data /*[
                {message: "Test toast 1", createdAt: "12 Apr 24, 10:30AM", author: "Ali", id: 1, isRead: true},
                {message: "Test toast 2", createdAt: "18 Apr 24, 10:30AM", author: "Tom", id: 2, isRead: false},
            ]*/
        } else {
            throw new Error(resObj.message)
        }
    }

    static async updateNotifications (id: number) {
        
    }
}