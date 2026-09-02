<template>
  <UModal
    :open="open"
    :title="title"
    :description="description"
    :close="{ onClick: close }"
    :ui="{ content: 'sm:max-w-lg' }"
    data-test="vesting-action-review-modal"
    @update:open="handleOpenChange"
  >
    <template #body>
      <div v-if="schedule" class="space-y-4">
        <UAlert
          v-if="actionError"
          color="error"
          variant="soft"
          :description="actionError"
          data-test="vesting-action-error"
        />
        <UAlert
          :color="kind === 'stop' ? 'warning' : 'info'"
          variant="soft"
          :icon="kind === 'stop' ? 'i-lucide-triangle-alert' : 'i-lucide-wallet-cards'"
          :title="alertTitle"
          :description="alertDescription"
        />
        <dl class="divide-y rounded-xl border border-gray-200 px-4 dark:border-gray-800">
          <div
            v-for="item in summary"
            :key="item.label"
            class="flex items-center justify-between gap-4 py-3"
          >
            <dt class="text-muted text-sm">{{ item.label }}</dt>
            <dd class="text-right text-sm font-medium">{{ item.value }}</dd>
          </div>
        </dl>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            label="Cancel"
            :disabled="isPending"
            data-test="vesting-action-cancel"
            @click="close"
          />
          <UButton
            :color="kind === 'stop' ? 'error' : 'success'"
            :label="kind === 'stop' ? 'Stop vesting' : 'Release shares'"
            :loading="isPending"
            :disabled="isPending"
            data-test="vesting-action-confirm"
            @click="confirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import type { Address } from 'viem'
import type { VestingSchedule } from '@/types/vesting'
import { useVestingReleaseWrite, useVestingStopVestingWrite } from '@/composables/vesting/writes'
import { classifyError } from '@/utils/errors/classifyContractError'
import { formatVestingAmount } from '@/utils/vesting/presentation'

const props = defineProps<{
  open: boolean
  kind: 'release' | 'stop'
  schedule: VestingSchedule | null
  tokenSymbol: string
  memberName: (address: string) => string
}>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  success: [kind: 'release' | 'stop']
}>()
const toast = useToast()
const releaseWrite = useVestingReleaseWrite()
const stopWrite = useVestingStopVestingWrite()
const isSubmitting = ref(false)
const actionError = ref('')
const isPending = computed(
  () => isSubmitting.value || releaseWrite.isPending.value || stopWrite.isPending.value
)
const title = computed(() =>
  props.kind === 'stop' ? 'Review vesting cancellation' : 'Review share release'
)
const description = computed(() =>
  props.kind === 'stop'
    ? 'Confirm the settlement before signing in your wallet.'
    : 'Confirm the amount that will be minted before signing in your wallet.'
)
const alertTitle = computed(() =>
  props.kind === 'stop'
    ? 'This permanently ends future accrual.'
    : 'Only currently claimable shares will be minted.'
)
const alertDescription = computed(() =>
  props.kind === 'stop'
    ? 'Already vested shares are minted to the beneficiary. The unvested remainder is cancelled.'
    : 'The schedule stays active until the full grant is released or the owner stops it.'
)
const summary = computed(() => {
  if (!props.schedule) return []
  const amount = (value: bigint) => formatVestingAmount(value, props.tokenSymbol)
  if (props.kind === 'release') {
    return [
      { label: 'Beneficiary', value: props.memberName(props.schedule.member) },
      { label: 'Claimable now', value: amount(props.schedule.claimableAmount) },
      {
        label: 'Released after confirmation',
        value: amount(props.schedule.releasedAmount + props.schedule.claimableAmount)
      },
      { label: 'Total grant', value: amount(props.schedule.totalAmount) }
    ]
  }
  return [
    { label: 'Beneficiary', value: props.memberName(props.schedule.member) },
    { label: 'Vested settlement', value: amount(props.schedule.claimableAmount) },
    { label: 'Previously released', value: amount(props.schedule.releasedAmount) },
    { label: 'Unvested amount cancelled', value: amount(props.schedule.unvestedAmount) }
  ]
})

function close() {
  if (!isPending.value) emit('update:open', false)
}
function handleOpenChange(open: boolean) {
  if (!open) close()
}
async function confirm() {
  if (!props.schedule) return
  isSubmitting.value = true
  actionError.value = ''
  try {
    if (props.kind === 'release') {
      await releaseWrite.mutateAsync({ args: [props.schedule.index] })
      toast.add({ title: 'Claimable shares released', color: 'success' })
    } else {
      await stopWrite.mutateAsync({
        args: [props.schedule.member as Address, props.schedule.index]
      })
      toast.add({ title: 'Vesting schedule stopped', color: 'success' })
    }
    emit('update:open', false)
    emit('success', props.kind)
  } catch (error: unknown) {
    const classified = classifyError(error, { contract: 'Vesting' })
    actionError.value =
      classified.category === 'user_rejected'
        ? 'The wallet request was rejected. No changes were made.'
        : classified.userMessage
  } finally {
    isSubmitting.value = false
  }
}
watch(
  () => [props.open, props.kind, props.schedule] as const,
  () => {
    actionError.value = ''
  }
)
</script>
