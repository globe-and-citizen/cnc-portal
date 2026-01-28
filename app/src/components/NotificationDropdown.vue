<template>
  <div class="dropdown dropdown-end">
    <div tabindex="0" role="button" class="">
      <div class="btn btn-ghost btn-circle m-1" data-test="notifications">
        <div class="indicator">
          <IconifyIcon icon="heroicons:bell" class="size-6" />
          <span v-if="isUnread" class="badge badge-xs badge-primary indicator-item"></span>
        </div>
      </div>
    </div>
    <ul
      tabindex="0"
      class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-[300px]"
      data-test="notification-dropdown"
    >
      <li v-for="notification in paginatedNotifications" :key="notification.id">
        <a @click="handleNotification(notification)" :data-test="`notification-${notification.id}`">
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
          <IconifyIcon icon="heroicons:chevron-left" class="size-6" />
        </ButtonUI>
        <span class="join-item btn-primary"> {{ currentPage }} / {{ totalPages }} </span>
        <ButtonUI
          variant="primary"
          size="xs"
          class="join-item btn"
          :class="currentPage == totalPages ? 'btn-disabled' : ''"
          @click="currentPage < totalPages ? currentPage++ : currentPage"
        >
          <IconifyIcon icon="heroicons:chevron-right" class="size-6" />
        </ButtonUI>
      </div>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { type Notification } from '@/types'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from './ButtonUI.vue'
import { useRouter } from 'vue-router'
import {
  useNotificationsQuery,
  useUpdateNotificationMutation
} from '@/queries/notification.queries'

const router = useRouter()
const currentPage = ref(1)
const itemsPerPage = ref(4)

const { data: notifications } = useNotificationsQuery()
const { mutateAsync: updateNotification } = useUpdateNotificationMutation()

const totalPages = computed(() => {
  if (!notifications.value?.length) return 1
  return Math.max(1, Math.ceil(notifications.value.length / itemsPerPage.value))
})

const isUnread = computed(() => {
  const idx =
    notifications.value?.findIndex((notification: Notification) => notification.isRead === false) ??
    -1
  return idx > -1
})

const paginatedNotifications = computed(() => {
  if (!notifications.value) return []
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return notifications.value.slice(start, end)
})

const redirect = (notification: Notification) => {
  if (notification.resource) {
    const resourceArr = notification.resource.split('/')
    switch (resourceArr[0]) {
      case 'teams':
        router.push(`/${notification.resource}`)
        break
      case 'elections':
        router.push(`/teams/${resourceArr[1]}/administration/bod-elections`)
        break
    }
  }

  return false
}

const handleNotification = async (notification: Notification) => {
  await updateNotification({ id: notification.id })
  redirect(notification)
}
</script>
