<template>
  <UCard data-test="safe-history-card">
    <template #header>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="font-semibold">Safe history</h3>
          <p class="mt-1 text-sm text-gray-500">
            Every Safe this team registered. A disabled Safe keeps its history.
          </p>
        </div>
        <div v-if="$slots.actions" class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <slot name="actions" />
        </div>
      </div>
    </template>

    <ul class="divide-y divide-gray-200 dark:divide-gray-800">
      <li
        v-for="safe in safeRows"
        :key="safe.address"
        class="flex flex-wrap items-center justify-between gap-3 py-3"
        data-test="safe-history-row"
      >
        <div class="min-w-0">
          <AddressTooltip :address="safe.address" class="font-mono text-sm" />
          <p class="mt-1 text-xs text-gray-500">{{ safe.dateLabel }}</p>
        </div>
        <div class="flex items-center gap-2">
          <UBadge :color="STATUS_COLOR[safe.status]" variant="soft" data-test="safe-history-status">
            {{ safe.status }}
          </UBadge>
          <template v-if="canChangeSafes">
            <UButton
              v-if="safe.status !== 'Default'"
              color="secondary"
              variant="outline"
              icon="i-lucide-star"
              label="Default"
              data-test="safe-default-button"
              @click="askConfirmation(safe, 'default')"
            />
            <UButton
              v-if="safe.status === 'Disabled'"
              color="success"
              variant="outline"
              icon="i-lucide-power"
              label="Enable"
              data-test="safe-enable-button"
              @click="askConfirmation(safe, 'enable')"
            />
            <UButton
              v-else
              color="error"
              variant="outline"
              icon="i-lucide-power-off"
              label="Disable"
              data-test="safe-disable-button"
              @click="askConfirmation(safe, 'disable')"
            />
          </template>
        </div>
      </li>
    </ul>

    <UModal
      v-model:open="isConfirmOpen"
      :title="confirmCopy.title"
      :description="confirmCopy.description"
      data-test="safe-action-modal"
    >
      <template #body>
        <UAlert
          v-if="isLeavingDefaultSafe && heldTokens.length"
          class="mb-4"
          color="warning"
          variant="soft"
          icon="i-lucide-coins"
          title="The default Safe still holds tokens"
          :description="`It holds ${heldTokens.join(', ')}. Move them out before the team stops using it.`"
          data-test="safe-held-tokens-warning"
        />
        <div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <UButton
            color="neutral"
            variant="outline"
            label="Cancel"
            :disabled="isPending"
            data-test="cancel-button"
            @click="isConfirmOpen = false"
          />
          <UButton
            :color="actionToConfirm?.action === 'disable' ? 'error' : 'primary'"
            :icon="confirmCopy.icon"
            :label="confirmCopy.confirm"
            :loading="isPending"
            data-test="safe-action-confirm"
            @click="applyConfirmedAction"
          />
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import { useUpdateTeamSafeMutation } from '@/queries/contract.queries'
import { useGetSafeBalancesQuery } from '@/queries/safeClient.queries'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useTeamStore } from '@/stores'
import { formatDate } from '@/utils/format'
import { normalizeSafeAddress } from '@/utils/safe/address'
import { teamSafes } from '@/utils/safe/teamSafes'

type SafeAction = 'default' | 'disable' | 'enable'

const STATUS_COLOR = { Default: 'success', Previous: 'neutral', Disabled: 'error' } as const

const CONFIRM_COPY = {
  default: {
    title: 'Make this Safe the default?',
    description:
      'The team will use this Safe from now on. The current default Safe stays in the Safe history.',
    icon: 'i-lucide-star',
    confirm: 'Make default',
    success: 'Default Safe updated'
  },
  disable: {
    title: 'Disable this Safe?',
    description:
      'The team stops using this Safe, but it stays in the Safe history with all its transactions. If it is the default, the previous Safe still in use becomes the default.',
    icon: 'i-lucide-power-off',
    confirm: 'Disable Safe',
    success: 'Safe disabled'
  },
  enable: {
    title: 'Enable this Safe?',
    description:
      'The team can use this Safe again. It becomes the default again if no Safe was made default after it.',
    icon: 'i-lucide-power',
    confirm: 'Enable Safe',
    success: 'Safe enabled'
  }
} as const

const props = defineProps<{ canManage: boolean }>()

const teamStore = useTeamStore()
const toast = useToast()
const { isWriteDisabled } = useTeamWriteGuard()
const { mutate: updateTeamSafe, isPending } = useUpdateTeamSafeMutation()

const canChangeSafes = computed(() => props.canManage && !isWriteDisabled.value)
const defaultSafeAddress = computed(() => teamStore.getContractAddressByType('Safe'))
const isDefaultSafe = (address: string) =>
  address.toLowerCase() === defaultSafeAddress.value?.toLowerCase()

const safeRows = computed(() =>
  teamSafes(teamStore.currentTeam?.teamContracts).map((safe) => {
    const address = normalizeSafeAddress(safe.address)
    const activatedAt = Date.parse(safe.activatedAt ?? '')
    if (safe.removedAt) {
      return {
        address,
        activatedAt,
        status: 'Disabled',
        dateLabel: `Disabled ${formatDate(safe.removedAt)}`
      } as const
    }
    return {
      address,
      activatedAt,
      status: isDefaultSafe(address) ? 'Default' : 'Previous',
      dateLabel: `Made default ${formatDate(safe.activatedAt)}`
    } as const
  })
)
type SafeRow = (typeof safeRows.value)[number]

const isConfirmOpen = ref(false)
const actionToConfirm = ref<{ safe: SafeRow; action: SafeAction }>()
const confirmCopy = computed(() => CONFIRM_COPY[actionToConfirm.value?.action ?? 'default'])

/**
 * Switching, disabling the default Safe, or enabling a Safe made default after it stops the
 * team from using the Safe holding its funds.
 */
const isLeavingDefaultSafe = computed(() => {
  const defaultRow = safeRows.value.find((row) => row.status === 'Default')
  const { safe, action } = actionToConfirm.value ?? {}
  if (!safe || !defaultRow) return false
  if (action === 'disable') return safe.status === 'Default'
  return action === 'default' || safe.activatedAt > defaultRow.activatedAt
})

const { data: defaultSafeBalances } = useGetSafeBalancesQuery({
  pathParams: { safeAddress: () => (isConfirmOpen.value ? defaultSafeAddress.value : undefined) }
})
const heldTokens = computed(() =>
  (defaultSafeBalances.value?.items ?? [])
    .filter((item) => item.balance && item.balance !== '0')
    .map((item) => item.tokenInfo.symbol)
)

function askConfirmation(safe: SafeRow, action: SafeAction) {
  actionToConfirm.value = { safe, action }
  isConfirmOpen.value = true
}

function applyConfirmedAction() {
  if (!actionToConfirm.value) return
  const { safe, action } = actionToConfirm.value
  updateTeamSafe(
    { body: { teamId: Number(teamStore.currentTeamId), contractAddress: safe.address, action } },
    {
      onSuccess: () => {
        isConfirmOpen.value = false
        toast.add({ title: CONFIRM_COPY[action].success, color: 'success' })
      },
      onError: (error) => {
        toast.add({ title: 'Safe update failed', description: error.message, color: 'error' })
      }
    }
  )
}
</script>
