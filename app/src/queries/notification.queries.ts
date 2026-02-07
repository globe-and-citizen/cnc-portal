import type { BulkNotificationPayload, Notification } from '@/types/notification'
import { createQueryHook, createMutationHook, queryPresets } from './queryFactory'

/**
 * Query key factory for notification-related queries
 */
export const notificationKeys = {
  all: ['notifications'] as const
}

// ============================================================================
// GET /notification - Fetch notifications
// ============================================================================

/**
 * Empty params for useGetNotificationsQuery (no parameters needed)
 */

export interface GetNotificationsParams {}

/**
 * Fetch all notifications for the current user
 *
 * @endpoint GET /notification
 * @pathParams none
 * @queryParams none
 * @body none
 */
export const useGetNotificationsQuery = createQueryHook<Notification[], GetNotificationsParams>({
  endpoint: 'notification',
  queryKey: () => notificationKeys.all,
  options: {
    ...queryPresets.moderate,
    staleTime: 300_000,
    refetchInterval: 300_000
  }
})

// ============================================================================
// POST /notification/bulk/ - Create bulk notifications
// ============================================================================

/**
 * Combined parameters for useCreateBulkNotificationsMutation
 */
export interface CreateBulkNotificationsParams {
  body: BulkNotificationPayload
}

/**
 * Add bulk notifications
 *
 * @endpoint POST /notification/bulk/
 * @pathParams none
 * @queryParams none
 * @body BulkNotificationPayload
 */
export const useCreateBulkNotificationsMutation = createMutationHook<
  unknown,
  CreateBulkNotificationsParams
>({
  method: 'POST',
  endpoint: 'notification/bulk/',
  invalidateKeys: [notificationKeys.all]
})

// ============================================================================
// PUT /notification/{id} - Update notification
// ============================================================================

/**
 * Combined parameters for useUpdateNotificationMutation
 */
export interface UpdateNotificationParams {
  pathParams: {
    /** Notification ID */
    id: number
  }
}

/**
 * Update a notification (mark as read)
 *
 * @endpoint PUT /notification/{id}
 * @pathParams { id: number }
 * @queryParams none
 * @body none
 */
export const useUpdateNotificationMutation = createMutationHook<unknown, UpdateNotificationParams>({
  method: 'PUT',
  endpoint: 'notification/{id}',
  invalidateKeys: [notificationKeys.all]
})
