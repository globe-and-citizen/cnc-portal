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
import { ref, computed, watch, onMounted } from 'vue'
import { type Notification } from '@/types'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useUserDataStore, useNotificationsQuerytore } from '@/stores'
import { log, parseError } from '@/utils'
import { type Address, parseEther } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from './ButtonUI.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentPage = ref(1)
const itemsPerPage = ref(4)

const updateEndPoint = ref('')
const { addErrorToast, addSuccessToast } = useToastStore()
const useUserStore = useUserDataStore()
const notificationStore = useNotificationsQuerytore()

onMounted(async () => {
  try {
    await notificationStore.fetchNotifications()
  } catch (err) {
    addErrorToast('Failed to load notifications')
    console.error('error fetching notifications', err)
  }
})

const totalPages = computed(() => {
  if (!notificationStore.notifications?.length) return 1
  return Math.max(1, Math.ceil(notificationStore.notifications.length / itemsPerPage.value))
})

const isUnread = computed(() => {
  const idx = notificationStore.notifications.findIndex(
    (notification: Notification) => notification.isRead === false
  )
  return idx > -1
})

const paginatedNotifications = computed(() => {
  if (!notificationStore.notifications) return []
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return notificationStore.notifications.slice(start, end)
})

// useFetch instance for getting team details
const {
  error: getTeamError,
  data: team,
  // isFetching: isPending,
  execute: getTeamAPI
} = useCustomFetch(updateEndPoint, {
  immediate: false
})
  .get()
  .json()

//#region get claim
const {
  error: getClaimError,
  // isFetching: isClaimFetching,
  data: wageClaim,
  execute: getWageClaimAPI
} = useCustomFetch(updateEndPoint, {
  immediate: false
})
  .get()
  .json()
//#endregion get claim

//#region expense account composable
const {
  writeContract: executeCashRemunerationWithdraw,
  // isPending: isLoadingWithdraw,
  error: errorWithdraw,
  data: withdrawHash
} = useWriteContract()

const { isLoading: isConfirmingWithdraw, isSuccess: isConfirmedWithdraw } =
  useWaitForTransactionReceipt({
    hash: withdrawHash
  })

const getResource = (notification: Notification) => {
  if (notification.resource) {
    const resourceArr = notification.resource.split('/')
    return resourceArr
  } else return []
}

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
  await handleWage(notification)
  await updateNotification(notification)
  redirect(notification)
}

const handleWage = async (notification: Notification) => {
  const resourceArr = getResource(notification)

  if (!resourceArr || resourceArr[0] !== 'wage-claim') return
  updateEndPoint.value = `teams/${Number(resourceArr[1])}/cash-remuneration/claim`
  await getWageClaimAPI()
  updateEndPoint.value = `teams/${wageClaim.value.teamId}`
  await getTeamAPI()

  if (team.value.cashRemunerationEip712Address && wageClaim.value) {
    const claim = {
      employeeAddress: useUserStore.address,
      hoursWorked: wageClaim.value.hoursWorked,
      hourlyRate: parseEther(wageClaim.value.hourlyRate),
      date: Math.floor(new Date(wageClaim.value.createdAt).getTime() / 1000)
    }

    executeCashRemunerationWithdraw({
      address: team.value.cashRemunerationEip712Address as Address,
      // @ts-expect-error type issue
      args: [claim, wageClaim.value.cashRemunerationSignature],
      abi: CASH_REMUNERATION_EIP712_ABI,
      functionName: 'withdraw'
    })
  }
}

const updateNotification = async (notification: Notification) => {
  await notificationStore.updateNotification(notification.id)
}

// Watchers for getting team details
watch(getTeamError, () => {
  if (getTeamError.value) {
    log.error(parseError(getTeamError.value))
    addErrorToast(getTeamError.value)
  }
})

watch(getClaimError, (newVal) => {
  if (newVal) {
    log.error(parseError(getTeamError.value))
    addErrorToast(getTeamError.value)
  }
})

watch(errorWithdraw, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to withdraw')
  }
})

watch(isConfirmingWithdraw, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedWithdraw.value) {
    addSuccessToast('Withdraw Successful')
  }
})
</script>
