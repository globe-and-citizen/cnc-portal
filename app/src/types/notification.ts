export interface Notification {
  id: number
  subject: string | null
  message: string
  isRead: boolean
  userAddress: string
  createdAt: Date
  author: string | null
}

export interface NotificationResponse {
  data: Notification[]
  success: boolean
}
