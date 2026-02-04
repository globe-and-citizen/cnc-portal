import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { BulkNotificationPayload, Notification } from '@/types/notification'

/**
 * Query key factory for notification-related queries
 */
export const notificationKeys = {
  all: ['notifications'] as const
}

/**
 * Path parameters for notification endpoints
 */
export interface NotificationPathParams {
  /** Notification ID */
  id: number
}

/**
 * Fetch all notifications for the current user
 *
 * @endpoint GET /notification
 * @params none
 * @queryParams none
 * @body none
 */
export const useGetNotificationsQuery = () => {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Notification[]>('notification')
      return data
    },
    staleTime: 300_000,
    refetchInterval: 300_000
  })
}

/**
 * Add bulk notifications
 *
 * @endpoint POST /notification/bulk/
 * @params none
 * @queryParams none
 * @body BulkNotificationPayload
 */
export const useCreateBulkNotificationsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: BulkNotificationPayload) => {
      const { data } = await apiClient.post('notification/bulk/', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    }
  })
}

/**
 * Update a notification (mark as read)
 *
 * @endpoint PUT /notification/{id}
 * @params NotificationPathParams - URL path parameter
 * @queryParams none
 * @body none
 */
export const useUpdateNotificationMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: NotificationPathParams) => {
      const { data } = await apiClient.put(`notification/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    }
  })
}
