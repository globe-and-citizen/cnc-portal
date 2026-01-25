import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { BulkNotificationPayload, Notification } from '@/types/notification'
/**
 * Fetch all notifications for the current user
 */
export const useNotificationsQuery = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<Notification[]>('notification')
      return data
    }
  })
}

/**
 * Add bulk notifications
 */
export const useAddBulkNotificationsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: BulkNotificationPayload) => {
      const { data } = await apiClient.post('notification/bulk/', payload)
      return data
    },
    onSuccess: () => {
      // Refresh notifications after adding
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}

/**
 * Update a notification (mark as read)
 */
export const useUpdateNotificationMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.put(`notification/${id}`)
      return data
    },
    onSuccess: () => {
      // Refresh notifications after update
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}
