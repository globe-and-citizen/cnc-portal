import type { Address } from 'viem'

export interface Notification {
  id: number
  subject: string | null
  message: string
  isRead: boolean
  userAddress: string
  createdAt: Date
  author: string | null
  resource: string | null
}

export interface NotificationResponse {
  data: Notification[]
  success: boolean
}

export interface NotificationPayload {
  userIds: Address[]
  message: string
  subject: string
  author: string
  resource: string
}
