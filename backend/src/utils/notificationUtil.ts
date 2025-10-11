import { prisma } from './'
import { isAddress } from 'viem'

export const addNotification = async (
  userIds: string[],
  notification: {
    message: string
    subject?: string
    author?: string
    resource?: string
  }
) => {
  let notifications = await Promise.all(
    userIds.map(async (userId: string) => {
      if (!isAddress(userId)) {
        throw new Error(`Invalid user address: ${userId}`)
      }

      return prisma.notification.create({
        data: {
          message: notification.message,
          userAddress: userId,
          subject: notification.subject ? notification.subject : null,
          author: notification.author ? notification.author : null,
          resource: notification.resource ? notification.resource : null
        }
      })
    })
  )

  return notifications
}
