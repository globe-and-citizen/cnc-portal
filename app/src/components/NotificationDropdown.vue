<template>
  <div class="dropdown dropdown-end">
    <div tabindex="0" role="button" class="">
      <div class="btn btn-ghost btn-circle m-1">
        <div class="indicator">
          <BellIcon class="size-6" />
          <span v-if="isUnread" class="badge badge-xs badge-primary indicator-item"></span>
        </div>
      </div>
    </div>
    <ul
      tabindex="0"
      class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-[300px]"
    >
      <li v-for="notification in paginatedNotifications" :key="notification.id">
        <a
          @click="updateNotification(notification)"
          :href="isInvitation(notification) ? `/${notification.resource}` : `#`"
        >
          <div class="notification__body">
            <span :class="{ 'font-bold': !notification.isRead }">
              {{ notification.message }}
            </span>
          </div>
          <!--<div class="notification__footer">{{ notification.author }} {{ notification.createdAt }}</div>-->
        </a>
      </li>
      <!-- Pagination Controls -->
      <div
        class="join flex justify-between items-center p-2"
        v-if="paginatedNotifications.length > 0"
      >
        <ButtonUI
          variant="primary"
          size="xs"
          class="join-item"
          :class="currentPage === 1 ? 'btn-disabled' : ''"
          @click="currentPage > 1 ? currentPage-- : currentPage"
        >
          <ChevronLeftIcon class="size-6" />
        </ButtonUI>
        <span class="join-item btn-primary"> {{ currentPage }} / {{ totalPages }} </span>
        <ButtonUI
          variant="primary"
          size="xs"
          class="join-item btn"
          :class="currentPage == totalPages ? 'btn-disabled' : ''"
          @click="currentPage < totalPages ? currentPage++ : currentPage"
        >
          <ChevronRightIcon class="size-6" />
        </ButtonUI>
      </div>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { type NotificationResponse, type Notification } from '@/types'
import { useCustomFetch } from '@/composables/useCustomFetch'

import { BellIcon } from '@heroicons/vue/24/outline'
import { ChevronLeftIcon } from '@heroicons/vue/24/outline'
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import ButtonUI from './ButtonUI.vue'

const currentPage = ref(1)
const itemsPerPage = ref(4)
const totalPages = ref(0)

const updateEndPoint = ref('')
const {
  //isFetching: isNotificationsFetching,
  //error: notificationError,
  data: notifications,
  execute: executeFetchNotifications
} = useCustomFetch<NotificationResponse>('notification').json()

const {
  //isFetching: isUpdateNotificationsFetching,
  //error: isUpdateNotificationError,
  execute: executeUpdateNotifications
  //data: _notifications
} = useCustomFetch<NotificationResponse>(updateEndPoint, {
  immediate: false
})
  .put()
  .json()

watch(notifications, () => {
  totalPages.value = Math.ceil(notifications.value.data.length / itemsPerPage.value)
})
const isUnread = computed(() => {
  const idx = notifications.value?.data.findIndex(
    (notification: Notification) => notification.isRead === false
  )
  return idx > -1
})

const isInvitation = (notification: Notification) => {
  if (notification.resource) {
    const resourceArr = notification.resource.split('/')
    if (resourceArr[0] === 'teams') return true
  }

  return false
}

const updateNotification = async (notification: Notification) => {
  updateEndPoint.value = `notification/${notification.id}`

  await executeUpdateNotifications()
  await executeFetchNotifications()
}

const paginatedNotifications = computed(() => {
  if (!notifications.value?.data) return []
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return notifications.value.data.slice(start, end)
})
</script>
