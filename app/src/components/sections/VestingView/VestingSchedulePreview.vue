<template>
  <section class="border-default bg-muted/40 rounded-xl border p-4" data-test="schedule-preview">
    <div class="mb-4">
      <h3 class="font-semibold">Schedule preview</h3>
      <p class="text-muted text-sm">All boundaries are exact to the minute.</p>
    </div>

    <div v-if="!startAt || !endAt || endAt <= startAt" class="text-muted py-8 text-center text-sm">
      Choose an end date and time to preview the schedule.
    </div>

    <div v-else>
      <ul data-test="schedule-timeline">
        <li
          v-for="(boundary, index) in boundaries"
          :key="boundary.label"
          class="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
          data-test="schedule-boundary"
        >
          <div
            v-if="index < boundaries.length - 1"
            class="bg-primary/25 absolute top-3 -bottom-3 left-3 w-0.5 -translate-x-1/2"
            aria-hidden="true"
          />
          <div
            class="bg-primary ring-muted relative z-10 size-6 rounded-full ring-4"
            aria-hidden="true"
          />
          <div class="min-w-0 pt-0.5 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
            <p class="text-muted text-xs font-medium tracking-wide uppercase">
              {{ boundary.label }}
            </p>
            <p
              class="mt-1 text-sm font-semibold whitespace-nowrap sm:mt-0 sm:text-right"
              :data-test="boundary.testId"
            >
              {{ boundary.value }}
            </p>
          </div>
        </li>
      </ul>

      <UAlert
        class="mt-5"
        color="info"
        variant="soft"
        icon="i-lucide-info"
        :description="claimDescription"
        data-test="claim-preview"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatVestingBoundary, vestingAmountAtCliff } from '@/utils/vesting/schedule'
import { formatVestingAmount } from '@/utils/vesting/presentation'

interface Props {
  startAt: Date | null
  endAt: Date | null
  cliffEndAt: Date | null
  noCliff: boolean
  totalAmount: string
  tokenSymbol: string
}

const props = defineProps<Props>()

const boundaries = computed(() => [
  { label: 'Starts', value: formatVestingBoundary(props.startAt), testId: 'preview-start' },
  {
    label: props.noCliff ? 'No cliff' : 'Cliff ends',
    value: props.noCliff ? 'Vests immediately' : formatVestingBoundary(props.cliffEndAt),
    testId: 'preview-cliff'
  },
  { label: 'Fully vested', value: formatVestingBoundary(props.endAt), testId: 'preview-end' }
])

const claimDescription = computed(() => {
  if (props.noCliff) {
    return 'Shares begin vesting immediately and can be claimed as they accrue.'
  }

  const amount = vestingAmountAtCliff(
    props.totalAmount,
    props.startAt,
    props.cliffEndAt,
    props.endAt
  )
  if (amount === null || !props.cliffEndAt) {
    return 'Accrued shares become claimable when the cliff ends.'
  }

  return `${formatVestingAmount(amount, props.tokenSymbol)} will be accrued when the cliff ends.`
})
</script>
