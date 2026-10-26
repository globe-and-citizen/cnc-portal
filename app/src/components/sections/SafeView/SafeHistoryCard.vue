<template>
  <UCard data-test="safe-history-card">
    <template #header>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="font-semibold">Safe history</h3>
          <p class="mt-1 text-sm text-gray-500">
            Every Safe this team registered. A removed Safe keeps its history.
          </p>
        </div>
        <div v-if="canEdit" class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <SafeAddModal />
        </div>
      </div>
    </template>

    <UAlert
      v-if="isRouterOutOfSync"
      class="mb-4"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Investments still go to another Safe"
      description="The deposit router sends new investments to a Safe that is not the team default. Point it at the default Safe."
      data-test="safe-router-out-of-sync"
    >
      <template #actions>
        <SetSafeAddressAction />
      </template>
    </UAlert>

    <ul class="divide-y divide-gray-200 dark:divide-gray-800">
      <li
        v-for="safe in rows"
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
          <template v-if="canEdit">
            <UButton
              v-if="safe.status !== 'Default'"
              size="sm"
              color="primary"
              variant="outline"
              icon="i-lucide-star"
              label="Set as default"
              data-test="safe-set-default-button"
              @click="openConfirm(safe.address, 'default')"
            />
            <UButton
              v-if="safe.status !== 'Removed'"
              size="sm"
              color="error"
              variant="outline"
              icon="i-lucide-trash-2"
              label="Remove"
              data-test="safe-remove-button"
              @click="openConfirm(safe.address, 'remove')"
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
            :color="pending?.action === 'remove' ? 'error' : 'primary'"
            :icon="confirmCopy.icon"
            :label="confirmCopy.confirm"
            :loading="isPending"
            data-test="safe-action-confirm"
            @click="submit"
          />
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import { useToast } from '@nuxt/ui/composables'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import SafeAddModal from '@/components/sections/SafeView/SafeAddModal.vue'
import SetSafeAddressAction from '@/components/sections/SherTokenView/InvestorActions/SetSafeAddressAction.vue'
import { useUpdateTeamSafeMutation } from '@/queries/contract.queries'
import { useGetSafeBalancesQuery } from '@/queries/safeClient.queries'
import { useSafeDepositRouterSafeAddress } from '@/composables/safeDepositRouter/reads'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useTeamStore } from '@/stores'
import { formatDate } from '@/utils/format'
import { normalizeSafeAddress } from '@/utils/safe/address'

type SafeAction = 'default' | 'remove'

const STATUS_COLOR = { Default: 'success', Previous: 'neutral', Removed: 'error' } as const

const CONFIRM_COPY = {
  default: {
    title: 'Make this Safe the default?',
    description:
      'The team will use this Safe from now on. The current default Safe stays in the Safe history.',
    icon: 'i-lucide-star',
    confirm: 'Make default',
    success: 'Default Safe updated'
  },
  remove: {
    title: 'Remove this Safe?',
    description:
      'The Safe leaves the team but stays in the Safe history with all its transactions. The previous Safe still in use becomes the default.',
    icon: 'i-lucide-trash-2',
    confirm: 'Remove Safe',
    success: 'Safe removed'
  }
} as const

const props = defineProps<{ canManage: boolean }>()

const teamStore = useTeamStore()
const toast = useToast()
const { isWriteDisabled } = useTeamWriteGuard()
const { mutate: updateTeamSafe, isPending } = useUpdateTeamSafeMutation()

const canEdit = computed(() => props.canManage && !isWriteDisabled.value)
const defaultSafe = computed(() => teamStore.getContractAddressByType('Safe'))
const isDefaultSafe = (address: string) =>
  address.toLowerCase() === defaultSafe.value?.toLowerCase()

const rows = computed(() =>
  (teamStore.currentTeam?.safes ?? []).map((safe) => {
    const address = normalizeSafeAddress(safe.address)
    if (safe.removedAt) {
      return {
        address,
        status: 'Removed',
        dateLabel: `Removed ${formatDate(safe.removedAt)}`
      } as const
    }
    return {
      address,
      status: isDefaultSafe(address) ? 'Default' : 'Previous',
      dateLabel: `Made default ${formatDate(safe.activatedAt)}`
    } as const
  })
)

const { data: routerSafe } = useSafeDepositRouterSafeAddress()
const isRouterOutOfSync = computed(
  () => !!routerSafe.value && !!defaultSafe.value && !isDefaultSafe(routerSafe.value as string)
)

const isConfirmOpen = ref(false)
const pending = ref<{ address: Address; action: SafeAction }>()
const confirmCopy = computed(() => CONFIRM_COPY[pending.value?.action ?? 'default'])

/** Switching, or removing the default Safe, stops the team from using the Safe holding its funds. */
const isLeavingDefaultSafe = computed(
  () =>
    pending.value?.action === 'default' ||
    (pending.value?.action === 'remove' && isDefaultSafe(pending.value.address))
)

const { data: defaultSafeBalances } = useGetSafeBalancesQuery({
  pathParams: { safeAddress: () => (isConfirmOpen.value ? defaultSafe.value : undefined) }
})
const heldTokens = computed(() =>
  (defaultSafeBalances.value?.items ?? [])
    .filter((item) => item.balance && item.balance !== '0')
    .map((item) => item.tokenInfo.symbol)
)

function openConfirm(address: Address, action: SafeAction) {
  pending.value = { address, action }
  isConfirmOpen.value = true
}

function submit() {
  if (!pending.value) return
  const { address, action } = pending.value
  updateTeamSafe(
    { body: { teamId: Number(teamStore.currentTeamId), contractAddress: address, action } },
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
