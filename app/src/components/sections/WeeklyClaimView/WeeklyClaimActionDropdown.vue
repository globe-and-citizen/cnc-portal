<template>
  <div v-if="status !== 'withdrawn'" class="relative inline-flex items-center" ref="dropdownRef">
    <!-- Dropdown menu positioned to the left -->
    <ul
      v-if="isOpen"
      class="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 menu p-2 shadow-lg bg-base-100 rounded-box w-52 z-[99999] border border-base-300"
    >
      <!-- Pending status: Sign -->
      <template v-if="status === 'pending'">
        <li class="disabled" data-test="pending-withdraw">
          <a class="text-sm"> Withdraw </a>
        </li>
        <li
          :class="{ disabled: !isCashRemunerationOwner || isCurrentWeek(weeklyClaim) }"
          data-test="pending-sign"
        >
          <!-- <a
            data-test="sign-action"
            @click="isCashRemunerationOwner ? handleAction('sign') : null"
            class="text-sm"
          >
            Sign
          </a> -->
          <CRSigne
            :weekly-claim="weeklyClaim"
            :is-drop-down="true"
            :disabled="isCurrentWeek(weeklyClaim)"
            :loading="signLoading"
            @loading="(v: boolean) => (signLoading = v)"
            @close="isOpen = false"
          />
        </li>
      </template>

      <!-- Signed status: Withdraw and Disable -->
      <template v-else-if="status === 'signed'">
        <li data-test="signed-withdraw" :class="{ disabled: !isClaimOwner }">
          <!-- <a @click="handleAction('withdraw')" class="text-sm"> Withdraw </a> -->
          <CRWithdrawClaim
            :weekly-claim="weeklyClaim"
            :is-drop-down="true"
            :is-claim-owner="isClaimOwner"
            :loading="withdrawLoading"
            @loading="(v: boolean) => (withdrawLoading = v)"
            @claim-withdrawn="isOpen = false"
          />
        </li>
        <li data-test="signed-disable" :class="{ disabled: !isCashRemunerationOwner }">
          <a
            :class="['text-sm', { disabled: disableLoading }]"
            :aria-disabled="disableLoading"
            :tabindex="disableLoading ? -1 : 0"
            :style="{ pointerEvents: disableLoading ? 'none' : undefined }"
            @click="
              async () => {
                if (disableLoading) return
                await disableClaim()
              }
            "
          >
            <span v-if="disableLoading" class="loading loading-spinner loading-xs mr-2"></span>
            Disable
          </a>
        </li>
      </template>

      <!-- Disabled status: Enable and Resign -->
      <template v-else-if="status === 'disabled'">
        <li data-test="disabled-withdraw" class="disabled">
          <a class="text-sm"> Withdraw </a>
        </li>
        <li data-test="disabled-enable" :class="{ disabled: !isCashRemunerationOwner }">
          <!-- <a @click="isCashRemunerationOwner ? handleAction('enable') : null" class="text-sm">
            Enable
          </a> -->
          <WeeklyClaimActionEnable
            :weekly-claim="weeklyClaim"
            :is-cash-remuneration-owner="isCashRemunerationOwner"
            :loading="enableLoading"
            @loading="(v: boolean) => (enableLoading = v)"
            @close="isOpen = false"
          />
        </li>
        <li data-test="disabled-resign" :class="{ disabled: !isCashRemunerationOwner }">
          <!-- <a @click="isCashRemunerationOwner ? handleAction('resign') : null" class="text-sm">
            Resign
          </a> -->
          <CRSigne
            :weekly-claim="weeklyClaim"
            :is-drop-down="true"
            :loading="resignLoading"
            @loading="(v: boolean) => (resignLoading = v)"
            @close="isOpen = false"
            :is-resign="true"
          />
        </li>
      </template>

      <!-- Withdrawn status: No actions 
      <li v-else-if="status === 'withdrawn'">
        <a class="text-sm text-gray-400 cursor-not-allowed"> No actions available </a>
      </li>-->
    </ul>

    <!-- Dropdown trigger button -->
    <ButtonUI class="btn-ghost" size="sm" @click.stop="toggleDropdown">
      <IconifyIcon :icon="ellipsisIcon" class="w-5 h-5" />
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useUserDataStore, useTeamStore, useToastStore } from '@/stores'
import { useReadContract } from '@wagmi/vue'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import type { WeeklyClaim } from '@/types'
import CRSigne from '../CashRemunerationView/CRSigne.vue'
import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'
import { simulateContract, waitForTransactionReceipt, writeContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { useCustomFetch } from '@/composables'
import { keccak256, type Address } from 'viem'
import { log, parseError } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import WeeklyClaimActionEnable from './WeeklyClaimActionEnable.vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

// Types
export type Status = 'pending' | 'signed' | 'disabled' | 'withdrawn'
export type Action = 'sign' | 'withdraw' | 'disable' | 'enable' | 'resign'

// Props
interface Props {
  weeklyClaim: WeeklyClaim
  status: Status
}

const props = withDefaults(defineProps<Props>(), {
  status: 'pending'
})

const userStore = useUserDataStore()
const teamStore = useTeamStore()
const toastStore = useToastStore()
const queryClient = useQueryClient()

// Reactive data
const isOpen = ref<boolean>(false)
const dropdownRef = ref<HTMLElement | null>(null)
const ellipsisIcon: string = 'heroicons:ellipsis-vertical'

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

const isClaimOwner = computed(() => userStore.address === props.weeklyClaim.memberAddress)
const currentWeekStart = computed(() => dayjs().utc().startOf('isoWeek').toISOString())
const isCurrentWeek = (claim: WeeklyClaim): boolean => currentWeekStart.value === claim.weekStart

const {
  data: cashRemunerationOwner
  // isFetching: isCashRemunerationOwnerFetching,
  // error: cashRemunerationOwnerError
} = useReadContract({
  functionName: 'owner',
  address: cashRemunerationAddress,
  abi: CASH_REMUNERATION_EIP712_ABI
})

const isCashRemunerationOwner = computed(() => userStore.address === cashRemunerationOwner.value)

const claimAction = ref<'disable' | null>(null)

const weeklyClaimSyncUrl = computed(() => `/weeklyclaim/sync/?teamId=${teamStore.currentTeam?.id}`)

//  `/weeklyclaim/${props.weeklyClaim.id}/?action=${claimAction.value}`

const { execute: syncWeeklyClaim, error: syncWeeklyClaimError } = useCustomFetch(
  weeklyClaimSyncUrl,
  {
    immediate: false
  }
)
  .post()
  .json()

const signLoading = ref(false)
const resignLoading = ref(false)
const disableLoading = ref(false)
const withdrawLoading = ref(false)
const enableLoading = ref(false)

// Methods
const disableClaim = async () => {
  if (!isCashRemunerationOwner.value) return

  disableLoading.value = true
  if (!cashRemunerationAddress.value) {
    toastStore.addErrorToast('Cash Remuneration EIP712 contract address not found')
    disableLoading.value = false
    return
  }
  try {
    const args = {
      abi: CASH_REMUNERATION_EIP712_ABI,
      functionName: 'disableClaim' as const,
      args: [keccak256(props.weeklyClaim.signature as Address)] as const
    }
    await simulateContract(config, {
      ...args,
      address: cashRemunerationAddress.value
    })

    const hash = await writeContract(config, {
      ...args,
      address: cashRemunerationAddress.value
    })

    // Wait for transaction receipt
    const receipt = await waitForTransactionReceipt(config, {
      hash
    })

    if (receipt.status === 'success') {
      toastStore.addSuccessToast('Claim disabled')

      claimAction.value = 'disable'

      await syncWeeklyClaim()

      if (syncWeeklyClaimError.value) {
        toastStore.addErrorToast('Failed to update Claim status')
      }
      queryClient.invalidateQueries({
        queryKey: ['weekly-claims', teamStore.currentTeam?.id]
      })

      // Stop loading only on success and close dropdown
      disableLoading.value = false
      isOpen.value = false
    } else {
      toastStore.addErrorToast('Transaction failed: Failed to disable claim')
      // keep loading until explicit success
    }
  } catch (error) {
    console.log('error: ', error)
    log.error('Disable error', error)
    const parsed = parseError(error, CASH_REMUNERATION_EIP712_ABI)

    toastStore.addErrorToast(parsed)
    // Stop loading on user cancel or any explicit error
    disableLoading.value = false
  }
}

const toggleDropdown = (): void => {
  isOpen.value = !isOpen.value
}

const handleClickOutside = (event: MouseEvent): void => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

// Event listeners
onMounted((): void => {
  // Use setTimeout to ensure the listener is added after the current click event
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 0)
})

onUnmounted((): void => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
