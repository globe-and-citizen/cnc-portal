<template>
  <UModal
    :open="open"
    title="Schedule details"
    :ui="{ content: 'sm:max-w-xl' }"
    data-test="vesting-details-modal"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div v-if="schedule" class="space-y-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-medium">{{ memberName(schedule.member) }}</p>
            <AddressToolTip :address="schedule.member" slice class="text-muted text-xs" />
          </div>
          <UBadge :color="stateMeta(schedule.state).color" variant="soft">
            {{ stateMeta(schedule.state).label }}
          </UBadge>
        </div>

        <dl class="grid grid-cols-2 gap-4 rounded-xl border p-4 dark:border-gray-800">
          <div v-for="detail in scheduleDetails" :key="detail.label">
            <dt class="text-muted text-xs">{{ detail.label }}</dt>
            <dd class="mt-1 text-sm font-medium">{{ detail.value }}</dd>
          </div>
        </dl>

        <div class="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
          <div v-for="boundary in boundaries" :key="boundary.label" class="space-y-1">
            <p class="text-muted text-xs">{{ boundary.label }}</p>
            <p class="text-sm font-medium">{{ boundary.local }}</p>
            <p class="text-muted text-xs">{{ boundary.utc }}</p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import type { VestingSchedule } from '@/types/vesting'
import { formatDateUtc, fromUnix } from '@/utils/format'
import {
  formatVestingAmount,
  formatVestingProgress,
  getVestingStateMeta
} from '@/utils/vestingPresentation'
import { formatVestingBoundary } from '@/utils'

const props = defineProps<{
  open: boolean
  schedule: VestingSchedule | null
  tokenSymbol: string
  memberName: (address: string) => string
}>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()

const stateMeta = getVestingStateMeta
const amount = (value: bigint) => formatVestingAmount(value, props.tokenSymbol)
const scheduleDetails = computed(() => {
  if (!props.schedule) return []
  return [
    { label: 'Promised', value: amount(props.schedule.totalAmount) },
    { label: 'Vested', value: amount(props.schedule.vestedAmount) },
    { label: 'Claimable', value: amount(props.schedule.claimableAmount) },
    { label: 'Released', value: amount(props.schedule.releasedAmount) },
    { label: 'Progress', value: formatVestingProgress(props.schedule.progress) },
    {
      label: props.schedule.state === 'cancelled' ? 'Cancelled' : 'Unvested',
      value: amount(props.schedule.unvestedAmount)
    }
  ]
})
const boundaries = computed(() => {
  if (!props.schedule) return []
  return [
    boundary('Starts', props.schedule.start),
    boundary('Cliff ends', props.schedule.cliffEnd),
    boundary('Fully vested', props.schedule.end)
  ]
})
const boundary = (label: string, timestamp: number) => {
  const value = fromUnix(timestamp).toDate()
  return { label, local: `${formatVestingBoundary(value)} local`, utc: formatDateUtc(value) }
}
</script>
