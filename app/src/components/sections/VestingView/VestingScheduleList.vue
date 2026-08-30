<template>
  <div class="hidden overflow-x-auto md:block">
    <UTable :data="schedules" :columns="columns" data-test="vesting-overview">
      <template #beneficiary-cell="{ row: { original: schedule } }">
        <div class="min-w-44">
          <p class="font-medium">{{ memberName(schedule.member) }}</p>
          <AddressToolTip :address="schedule.member" slice class="text-muted text-xs" />
        </div>
      </template>

      <template #progress-cell="{ row: { original: schedule } }">
        <div class="min-w-40">
          <div class="flex items-center justify-between gap-3 text-xs">
            <span class="font-medium">{{ formatProgress(schedule.progress) }}</span>
            <span class="text-muted">{{ nextStep(schedule) }}</span>
          </div>
          <div
            class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            role="progressbar"
            :aria-label="`${memberName(schedule.member)} vesting progress`"
            :aria-valuenow="schedule.progress"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="bg-primary h-full rounded-full"
              :style="{ width: `${schedule.progress}%` }"
            />
          </div>
        </div>
      </template>

      <template #amounts-cell="{ row: { original: schedule } }">
        <div class="min-w-40 text-sm">
          <p class="font-medium">{{ amount(schedule.claimableAmount) }} claimable</p>
          <p class="text-muted mt-1 text-xs">{{ amount(schedule.totalAmount) }} promised</p>
        </div>
      </template>

      <template #status-cell="{ row: { original: schedule } }">
        <div class="max-w-44 space-y-1.5">
          <UBadge :color="stateMeta(schedule.state).color" variant="soft">
            {{ stateMeta(schedule.state).label }}
          </UBadge>
          <p class="text-muted text-xs">{{ stateMeta(schedule.state).description }}</p>
        </div>
      </template>

      <template #actions-cell="{ row: { original: schedule } }">
        <ScheduleActions
          :can-release="canRelease(schedule)"
          :can-stop="canStop(schedule)"
          @details="emit('details', schedule)"
          @action="(kind) => emit('action', kind, schedule)"
        />
      </template>
    </UTable>
  </div>

  <div class="space-y-3 md:hidden" data-test="vesting-mobile-list">
    <article
      v-for="schedule in schedules"
      :key="`${schedule.member}-${schedule.index}`"
      class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
      data-test="vesting-mobile-card"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate font-medium">{{ memberName(schedule.member) }}</p>
          <AddressToolTip :address="schedule.member" slice class="text-muted text-xs" />
        </div>
        <UBadge :color="stateMeta(schedule.state).color" variant="soft">
          {{ stateMeta(schedule.state).label }}
        </UBadge>
      </div>

      <div class="mt-4 flex items-end justify-between gap-3">
        <div>
          <p class="text-muted text-xs">Claimable now</p>
          <p class="mt-1 font-semibold">{{ amount(schedule.claimableAmount) }}</p>
          <p class="text-muted mt-1 text-xs">{{ amount(schedule.totalAmount) }} promised</p>
        </div>
        <p class="text-muted text-xs">{{ formatProgress(schedule.progress) }} vested</p>
      </div>
      <div
        class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
        role="progressbar"
        :aria-label="`${memberName(schedule.member)} vesting progress`"
        :aria-valuenow="schedule.progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="bg-primary h-full rounded-full" :style="{ width: `${schedule.progress}%` }" />
      </div>
      <p class="text-muted mt-3 text-sm">{{ nextStep(schedule) }}</p>

      <ScheduleActions
        class="mt-4 border-t pt-4 dark:border-gray-800"
        :can-release="canRelease(schedule)"
        :can-stop="canStop(schedule)"
        mobile
        @details="emit('details', schedule)"
        @action="(kind) => emit('action', kind, schedule)"
      />
    </article>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import ScheduleActions from './VestingScheduleActions.vue'
import type { VestingSchedule } from '@/types/vesting'
import {
  formatVestingAmount,
  formatVestingProgress,
  getVestingNextStep,
  getVestingStateMeta
} from '@/utils/vestingPresentation'

const props = defineProps<{
  schedules: VestingSchedule[]
  tokenSymbol: string
  memberName: (address: string) => string
  canRelease: (schedule: VestingSchedule) => boolean
  canStop: (schedule: VestingSchedule) => boolean
}>()
const emit = defineEmits<{
  details: [schedule: VestingSchedule]
  action: [kind: 'release' | 'stop', schedule: VestingSchedule]
}>()

const columns: TableColumn<VestingSchedule>[] = [
  { accessorKey: 'beneficiary', header: 'Beneficiary' },
  { accessorKey: 'progress', header: 'Progress' },
  { accessorKey: 'amounts', header: 'Amounts' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' }
]
const amount = (value: bigint) => formatVestingAmount(value, props.tokenSymbol)
const formatProgress = formatVestingProgress
const nextStep = getVestingNextStep
const stateMeta = getVestingStateMeta
</script>
