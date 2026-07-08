<template>
  <a
    data-test="enable-action"
    :class="[
      'text-sm',
      { 'pointer-events-none opacity-50': enableTx.isPending.value || isTeamArchived }
    ]"
    :aria-disabled="enableTx.isPending.value || isTeamArchived"
    :tabindex="enableTx.isPending.value || isTeamArchived ? -1 : 0"
    :style="{ pointerEvents: enableTx.isPending.value || isTeamArchived ? 'none' : undefined }"
    :title="isTeamArchived ? archivedTooltip : undefined"
    @click="
      async () => {
        if (enableTx.isPending.value || isTeamArchived) return
        await enableClaim()
      }
    "
  >
    <UIcon
      v-if="enableTx.isPending.value"
      name="i-lucide-loader-circle"
      class="mr-2 h-3 w-3 animate-spin"
    />
    Enable
  </a>
</template>
<script lang="ts" setup>
import { useSyncWeeklyClaimsMutation } from '@/queries/weeklyClaim.queries'
import { keccak256 } from 'viem'
import { classifyError, log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useTeamStore } from '@/stores'
import type { WeeklyClaim } from '@/types'
import { useEnableClaim } from '@/composables/cashRemuneration/writes'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const props = defineProps<{
  isCashRemunerationOwner: boolean
  weeklyClaim: WeeklyClaim
}>()
const emit = defineEmits(['close'])

const teamStore = useTeamStore()
const { isWriteDisabled: isTeamArchived, archivedTooltip } = useTeamWriteGuard()
const toast = useToast()
const queryClient = useQueryClient()

const enableTx = useEnableClaim()
const { mutateAsync: syncWeeklyClaim } = useSyncWeeklyClaimsMutation()

const enableClaim = async () => {
  if (!props.isCashRemunerationOwner) return
  if (enableTx.isPending.value) return

  enableTx.mutate(
    { args: [keccak256(props.weeklyClaim.signature as `0x${string}`)] },
    {
      onSuccess: async () => {
        toast.add({ title: 'Claim enabled', color: 'success' })

        try {
          await syncWeeklyClaim({ queryParams: { teamId: teamStore.currentTeamId! } })
        } catch {
          toast.add({ title: 'Failed to update Claim status', color: 'error' })
        }

        queryClient.invalidateQueries({
          queryKey: ['weekly-claims', teamStore.currentTeamId]
        })

        emit('close')
      },
      onError: (error) => {
        log.error('Enable error', error)
        const classified = classifyError(error, { contract: 'CashRemuneration' })
        if (classified.category === 'user_rejected') return
        toast.add({ title: classified.userMessage, color: 'error' })
      }
    }
  )
}
</script>
