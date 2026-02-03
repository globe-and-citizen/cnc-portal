import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { BulkNotificationPayload, Notification } from '@/types/notification'

/**
 * Fetch all notifications for the current user
 *
 * @endpoint GET /notification
 * @params none
 * @queryParams none
 * @body none
 */
export const useNotificationsQuery = () => {
  return useQuery({
    queryKey: ['notifications'],
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
export const useAddBulkNotificationsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: BulkNotificationPayload) => {
      const { data } = await apiClient.post('notification/bulk/', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}

/**
 * Mutation input for useUpdateNotificationMutation
 */
export interface UpdateNotificationInput {
  /** URL path parameter: notification ID */
  id: number
}

/**
 * Update a notification (mark as read)
 *
 * @endpoint PUT /notification/{id}
 * @params { id: number } - URL path parameter
 * @queryParams none
 * @body none
 */
export const useUpdateNotificationMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: UpdateNotificationInput) => {
      const { data } = await apiClient.put(`notification/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}
