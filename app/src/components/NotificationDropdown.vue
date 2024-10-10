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
          :href="getResource(notification)[0] === `teams` ? `/${notification.resource}` : `#`"
        >
          <div class="notification__body">
            <span :class="{ 'font-bold': !notification.isRead }">
              {{ notification.message }}
            </span>
          </div>
        </a>
      </li>
      <!-- Pagination Controls -->
      <div
        class="join flex justify-between items-center p-2"
        v-if="paginatedNotifications.length > 0"
      >
        <button
          class="join-item btn-primary btn btn-xs"
          :class="currentPage === 1 ? 'btn-disabled' : ''"
          @click="currentPage > 1 ? currentPage-- : currentPage"
        >
          <ChevronLeftIcon class="size-6" />
        </button>
        <span class="join-item btn-primary"> {{ currentPage }} / {{ totalPages }} </span>
        <button
          class="join-item btn btn-primary btn-xs"
          :class="currentPage == totalPages ? 'btn-disabled' : ''"
          @click="currentPage < totalPages ? currentPage++ : currentPage"
        >
          <ChevronRightIcon class="size-6" />
        </button>
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
import { useUserDataStore } from "@/stores/user"
import { log, parseError } from "@/utils";

const currentPage = ref(1)
const itemsPerPage = ref(4)
const totalPages = ref(0)

const endpointUrl = ref('')

const {
  data: notifications,
  execute: executeFetchNotifications
} = useCustomFetch<NotificationResponse>('notification')
  .get()
  .json()

const {
  execute: executeUpdateNotifications
} = useCustomFetch<NotificationResponse>(endpointUrl, {
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

const getResource = (notification: Notification) => {
  if (notification.resource) {
    const resourceArr = notification.resource.split('/')
    return resourceArr 
  } else return []
}

const {
  execute: executeFetchMemberContract,
  data: memberContract
} = useCustomFetch(endpointUrl, { 
  immediate: false, 
  beforeFetch: async ({ options, url, cancel }) => {
    options.headers = {
      memberaddress: `${useUserDataStore().address}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
    return { options, url, cancel }
  }
})
  .get()
  .json()

const signature = ref('')

const {
  execute: executeAddMemberSignature
} = useCustomFetch(endpointUrl, {
  immediate: false
})
  .put()
  .json()

const updateNotification = async (notification: Notification) => {
  const resource = getResource(notification)
  if (resource[0] === `role-assignment`) {
    endpointUrl.value = `teams/${resource[1]}/member/contract`
    //get contract
    await executeFetchMemberContract()
    const contract = JSON
      .parse(JSON.parse(memberContract.value.contract))
    //sign contract
    signature.value = await signContract(contract)
    //save signature
    endpointUrl.value = `teams/${resource[1]}/member/signature/${signature.value}`
    await executeAddMemberSignature()
  }
  endpointUrl.value = `notification/${notification.id}`

  await executeUpdateNotifications()
  await executeFetchNotifications()
}

const signContract = async (contract: undefined | Object) => {
  if (!contract) return
  const params = [
    useUserDataStore().address,
    {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" }
        ],
        Entitlement: [
          { name: "name", type: "string" },
          { name: "resource", type: "string" },
          { name: "accessLevel", type: "string" }
        ],
        Role: [
          { name: "name", type: "string" },
          { name: "entitlement", type: "Entitlement" }
        ],
        Contract: [
          { name: "assignedTo", type: "address" },
          { name: "assignedBy", type: "address" },
          { name: "role", type: "Role" }
        ]
      },
      primaryType: "Contract",
      domain: {
        "name": "CNC Contract",
        "version": "1"
      },
      message: contract
    }
  ]
  try {
    //@ts-ignore
    return await window.ethereum.request({method: "eth_signTypedData_v4", params: params})
  } catch (error) {
    log.error(parseError(error))
  }
}

const paginatedNotifications = computed(() => {
  if (!notifications.value?.data) return []
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return notifications.value.data.slice(start, end)
})
</script>
