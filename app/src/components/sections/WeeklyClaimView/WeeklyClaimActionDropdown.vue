<template>
  <div v-if="status !== 'withdrawn'" class="relative inline-flex items-center" ref="dropdownRef">
    <!-- Dropdown menu positioned to the left -->
    <ul
      v-if="isOpen"
      class="menu bg-base-100 rounded-box border-base-300 absolute top-1/2 right-full z-99999 mr-2 w-52 -translate-y-1/2 transform border p-2 shadow-lg"
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
          <CRSigne
            :weekly-claim="weeklyClaim"
            :is-drop-down="true"
            :disabled="isCurrentWeek(weeklyClaim)"
            @close="isOpen = false"
          />
        </li>
      </template>

      <!-- Signed status: Withdraw and Disable -->
      <template v-else-if="status === 'signed'">
        <li data-test="signed-withdraw" :class="{ disabled: !isClaimOwner }">
          <CRWithdrawClaim
            :weekly-claim="weeklyClaim"
            :is-drop-down="true"
            :is-claim-owner="isClaimOwner"
            @claim-withdrawn="isOpen = false"
          />
        </li>
        <li data-test="signed-disable" :class="{ disabled: !isCashRemunerationOwner }">
          <a
            :class="['text-sm', { disabled: disableTx.isPending.value }]"
            :aria-disabled="disableTx.isPending.value"
            :tabindex="disableTx.isPending.value ? -1 : 0"
            :style="{ pointerEvents: disableTx.isPending.value ? 'none' : undefined }"
            @click="
              async () => {
                if (disableTx.isPending.value) return
                await disableClaim()
              }
            "
          >
            <span
              v-if="disableTx.isPending.value"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
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
          <WeeklyClaimActionEnable
            :weekly-claim="weeklyClaim"
            :is-cash-remuneration-owner="isCashRemunerationOwner"
            @close="isOpen = false"
          />
        </li>
        <li data-test="disabled-resign" :class="{ disabled: !isCashRemunerationOwner }">
          <CRSigne
            :weekly-claim="weeklyClaim"
            :is-drop-down="true"
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
    <UButton variant="ghost" size="sm" @click.stop="toggleDropdown">
      <IconifyIcon :icon="ellipsisIcon" class="h-5 w-5" />
    </UButton>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useUserDataStore, useTeamStore } from '@/stores'
import { useReadContract } from '@wagmi/vue'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import type { WeeklyClaim } from '@/types'
import CRSigne from '../CashRemunerationView/CRSigne.vue'
import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'
import { useSyncWeeklyClaimsMutation } from '@/queries/weeklyClaim.queries'
import { keccak256 } from 'viem'
import { classifyError, log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useDisableClaim } from '@/composables/cashRemuneration/writes'
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
const toast = useToast()
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

const { mutateAsync: syncWeeklyClaim } = useSyncWeeklyClaimsMutation()

const disableTx = useDisableClaim()

const disableClaim = async () => {
  if (!isCashRemunerationOwner.value) return
  if (disableTx.isPending.value) return

  disableTx.mutate(
    { args: [keccak256(props.weeklyClaim.signature as `0x${string}`)] },
    {
      onSuccess: async () => {
        toast.add({ title: 'Claim disabled', color: 'success' })

        try {
          await syncWeeklyClaim({ queryParams: { teamId: teamStore.currentTeamId! } })
        } catch {
          toast.add({ title: 'Failed to update Claim status', color: 'error' })
        }

        queryClient.invalidateQueries({
          queryKey: ['weekly-claims', teamStore.currentTeamId]
        })

        isOpen.value = false
      },
      onError: (error) => {
        log.error('Disable error', error)
        const classified = classifyError(error, { contract: 'CashRemuneration' })
        if (classified.category === 'user_rejected') return
        toast.add({ title: classified.userMessage, color: 'error' })
      }
    }
  )
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
