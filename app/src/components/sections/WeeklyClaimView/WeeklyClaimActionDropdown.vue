<template>
  <div v-if="status !== 'withdrawn'" class="inline-flex items-center" ref="dropdownRef">
    <Teleport to="body">
      <ul
        v-if="isOpen"
        ref="menuRef"
        :style="menuStyle"
        class="bg-default border-default z-99999 flex w-52 flex-col gap-1 rounded-lg border p-2 shadow-lg"
      >
        <!-- Pending status: Sign -->
        <template v-if="status === 'pending'">
          <li class="pointer-events-none rounded-md opacity-50" data-test="pending-withdraw">
            <a class="block w-full px-3 py-1.5 text-sm"> Withdraw </a>
          </li>
          <li
            :class="[
              'hover:bg-muted rounded-md',
              {
                'pointer-events-none opacity-50':
                  !isCashRemunerationOwner || isCurrentWeek(weeklyClaim) || isWriteDisabled
              }
            ]"
            data-test="pending-sign"
          >
            <CRSigne
              :weekly-claim="weeklyClaim"
              :is-drop-down="true"
              :disabled="isCurrentWeek(weeklyClaim)"
              @close="closeDropdown"
            />
          </li>
        </template>

        <!-- Signed status: Withdraw and Disable.
           If the row's signature is bound to a stale CashRemunerationEIP712
           (post-redeploy), withdraw is meaningless on the new contract — show
           Re-sign instead so the approver re-binds against the current one. -->
        <template v-else-if="status === 'signed'">
          <li
            v-if="isStaleSignature"
            data-test="signed-resign"
            :class="[
              'hover:bg-muted rounded-md',
              { 'pointer-events-none opacity-50': !isCashRemunerationOwner }
            ]"
          >
            <CRSigne
              :weekly-claim="weeklyClaim"
              :is-drop-down="true"
              :is-resign="true"
              @close="closeDropdown"
            />
          </li>
          <li
            v-else
            data-test="signed-withdraw"
            :class="[
              'hover:bg-muted rounded-md',
              { 'pointer-events-none opacity-50': !isClaimOwner || isWriteDisabled }
            ]"
          >
            <CRWithdrawClaim
              :weekly-claim="weeklyClaim"
              :is-drop-down="true"
              :is-claim-owner="isClaimOwner"
              @claim-withdrawn="closeDropdown"
            />
          </li>
          <li
            data-test="signed-disable"
            :class="[
              'hover:bg-muted rounded-md',
              { 'pointer-events-none opacity-50': !isCashRemunerationOwner || isWriteDisabled }
            ]"
          >
            <a
              :class="[
                'block w-full cursor-pointer px-3 py-1.5 text-sm',
                { 'pointer-events-none opacity-50': disableTx.isPending.value || isWriteDisabled }
              ]"
              :title="isWriteDisabled ? archivedTooltip : undefined"
              :aria-disabled="disableTx.isPending.value"
              :tabindex="disableTx.isPending.value ? -1 : 0"
              :style="{ pointerEvents: disableTx.isPending.value ? 'none' : undefined }"
              @click="
                async () => {
                  if (disableTx.isPending.value || isWriteDisabled) return
                  await disableClaim()
                }
              "
            >
              <UIcon
                v-if="disableTx.isPending.value"
                name="i-lucide-loader-circle"
                class="mr-2 h-3 w-3 animate-spin"
              />
              Disable
            </a>
          </li>
        </template>

        <!-- Disabled status: Enable and Resign -->
        <template v-else-if="status === 'disabled'">
          <li data-test="disabled-withdraw" class="pointer-events-none rounded-md opacity-50">
            <a class="block w-full px-3 py-1.5 text-sm"> Withdraw </a>
          </li>
          <li
            data-test="disabled-enable"
            :class="[
              'hover:bg-muted rounded-md',
              { 'pointer-events-none opacity-50': !isCashRemunerationOwner }
            ]"
          >
            <WeeklyClaimActionEnable
              :weekly-claim="weeklyClaim"
              :is-cash-remuneration-owner="isCashRemunerationOwner"
              @close="closeDropdown"
            />
          </li>
          <li
            data-test="disabled-resign"
            :class="[
              'hover:bg-muted rounded-md',
              { 'pointer-events-none opacity-50': !isCashRemunerationOwner }
            ]"
          >
            <CRSigne
              :weekly-claim="weeklyClaim"
              :is-drop-down="true"
              @close="closeDropdown"
              :is-resign="true"
            />
          </li>
        </template>

        <!-- Withdrawn status: No actions
      <li v-else-if="status === 'withdrawn'">
        <a class="text-sm text-gray-400 cursor-not-allowed"> No actions available </a>
      </li>-->
      </ul>
    </Teleport>

    <!-- Dropdown trigger button -->
    <UButton variant="ghost" size="sm" @click.stop="toggleDropdown">
      <IconifyIcon :icon="ellipsisIcon" class="h-5 w-5" />
    </UButton>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import { ref, computed } from 'vue'
import { useWeeklyClaimDropdownMenu } from './useWeeklyClaimDropdown'
import { useUserDataStore, useTeamStore } from '@/stores'
import { useReadContract } from '@wagmi/vue'
import { cashRemunerationEip712Abi } from '@/artifacts/abi/generated'
import type { WeeklyClaim } from '@/types'
import CRSigne from '../CashRemunerationView/CRSigne.vue'
import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'
import { useSyncWeeklyClaimsMutation, weeklyClaimKeys } from '@/queries/weeklyClaim.queries'
import { keccak256 } from 'viem'
import { classifyError, log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useDisableClaim } from '@/composables/cashRemuneration/writes'
import WeeklyClaimActionEnable from './WeeklyClaimActionEnable.vue'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
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
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()
const toast = useToast()
const queryClient = useQueryClient()

// Reactive data
const dropdownRef = ref<HTMLElement | null>(null)
const ellipsisIcon: string = 'heroicons:ellipsis-vertical'

// Shared open-state + teleported/clamped positioning live in the composable.
const { isOpen, menuRef, menuStyle, toggleDropdown, closeDropdown } =
  useWeeklyClaimDropdownMenu(dropdownRef)

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
  abi: cashRemunerationEip712Abi
})

const isCashRemunerationOwner = computed(() => userStore.address === cashRemunerationOwner.value)

// A `signed` row whose stored verifying contract no longer matches the
// team's current CashRemunerationEIP712 was bound to a pre-redeploy
// generation. The on-chain contract for that signature is still live (so
// in theory withdrawable), but for issue #1825 the UX choice is: surface
// stale rows as "needs re-signing" and route the action to Re-sign instead
// of Withdraw, so the approver re-binds against the current contract.
const isStaleSignature = computed(() => {
  const signedAgainst = props.weeklyClaim.signedAgainstContractAddress
  const current = cashRemunerationAddress.value
  if (!signedAgainst || !current) return false
  return signedAgainst.toLowerCase() !== current.toLowerCase()
})

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
          queryKey: weeklyClaimKeys.teams()
        })

        closeDropdown()
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
</script>
