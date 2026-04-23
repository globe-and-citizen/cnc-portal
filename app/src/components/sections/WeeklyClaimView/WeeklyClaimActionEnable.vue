<template>
  <a
    data-test="enable-action"
    :class="['text-sm', { disabled: enableTx.isPending.value }]"
    :aria-disabled="enableTx.isPending.value"
    :tabindex="enableTx.isPending.value ? -1 : 0"
    :style="{ pointerEvents: enableTx.isPending.value ? 'none' : undefined }"
    @click="
      async () => {
        if (enableTx.isPending.value) return
        await enableClaim()
      }
    "
  >
    <span v-if="enableTx.isPending.value" class="loading loading-spinner loading-xs mr-2"></span>
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

const props = defineProps<{
  isCashRemunerationOwner: boolean
  weeklyClaim: WeeklyClaim
}>()
const emit = defineEmits(['close'])

const teamStore = useTeamStore()
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
