<template>
  <UCard data-test="vesting-schedules-card">
    <template #header>
      <div class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">Schedules</h2>
          <p class="text-muted mt-1 text-sm">
            Follow each grant, understand what happens next, and act when shares are available.
          </p>
        </div>
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            class="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
            aria-label="Schedule scope"
          >
            <UButton
              v-for="scope in scopes"
              :key="scope.value"
              size="sm"
              color="neutral"
              :variant="selectedScope === scope.value ? 'solid' : 'ghost'"
              :label="scope.label"
              :data-test="`vesting-scope-${scope.value}`"
              @click="selectedScope = scope.value"
            />
          </div>
          <USelect
            v-model="selectedStatus"
            :items="statusOptions"
            class="w-full lg:w-52"
            aria-label="Filter vesting schedules by status"
            data-test="vesting-status-filter"
          />
        </div>
      </div>
    </template>

    <div
      v-if="isLoading"
      class="flex min-h-48 items-center justify-center"
      role="status"
      aria-live="polite"
      data-test="vesting-loading"
    >
      <div class="text-center">
        <UIcon name="i-lucide-loader-circle" class="text-primary mx-auto size-8 animate-spin" />
        <p class="text-muted mt-3 text-sm">Loading vesting schedules…</p>
      </div>
    </div>
    <div v-else-if="error" class="py-8 text-center" data-test="vesting-error">
      <UIcon name="i-lucide-circle-alert" class="text-error mx-auto size-8" />
      <p class="mt-3 font-medium">Schedules could not be loaded</p>
      <p class="text-muted mt-1 text-sm">Check the active network, then try again.</p>
      <UButton
        class="mt-4"
        color="neutral"
        variant="outline"
        label="Try again"
        data-test="vesting-retry"
        @click="emit('retry')"
      />
    </div>
    <div
      v-else-if="filteredSchedules.length === 0"
      class="py-10 text-center"
      data-test="vesting-empty"
    >
      <UIcon name="i-lucide-calendar-clock" class="text-muted mx-auto size-9" />
      <p class="mt-3 font-medium">{{ emptyTitle }}</p>
      <p class="text-muted mx-auto mt-1 max-w-md text-sm">{{ emptyDescription }}</p>
      <UButton
        v-if="selectedStatus !== 'all'"
        class="mt-4"
        color="neutral"
        variant="outline"
        label="Show all schedules"
        data-test="vesting-clear-filter"
        @click="selectedStatus = 'all'"
      />
    </div>
    <VestingScheduleList
      v-else
      :schedules="filteredSchedules"
      :token-symbol="tokenSymbol"
      :member-name="memberName"
      :can-release="canRelease"
      :can-stop="canStop"
      @details="selectedSchedule = $event"
      @action="openActionReview"
    />

    <VestingScheduleDetailsModal
      v-model:open="detailsOpen"
      :schedule="selectedSchedule"
      :token-symbol="tokenSymbol"
      :member-name="memberName"
    />
    <VestingActionReviewModal
      v-model:open="actionOpen"
      :kind="actionKind"
      :schedule="actionSchedule"
      :token-symbol="tokenSymbol"
      :member-name="memberName"
      @success="emit('reload')"
    />
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import type { VestingSchedule, VestingScheduleState, VestingStatus } from '@/types/vesting'
import VestingActionReviewModal from './VestingActionReviewModal.vue'
import VestingScheduleDetailsModal from './VestingScheduleDetailsModal.vue'
import VestingScheduleList from './VestingScheduleList.vue'

const props = defineProps<{
  schedules: VestingSchedule[]
  tokenSymbol: string
  isLoading: boolean
  error: unknown
}>()
const emit = defineEmits<{ reload: []; retry: [] }>()
const teamStore = useTeamStore()
const userStore = useUserDataStore()
const { isWriteDisabled } = useTeamWriteGuard()
const selectedScope = ref<'mine' | 'team'>(
  teamStore.currentTeam?.ownerAddress.toLowerCase() === userStore.address?.toLowerCase()
    ? 'team'
    : 'mine'
)
const selectedStatus = ref<VestingStatus>('all')
const selectedSchedule = ref<VestingSchedule | null>(null)
const actionSchedule = ref<VestingSchedule | null>(null)
const actionKind = ref<'release' | 'stop'>('release')
const detailsOpen = computed({
  get: () => selectedSchedule.value !== null,
  set: (open) => {
    if (!open) selectedSchedule.value = null
  }
})
const actionOpen = computed({
  get: () => actionSchedule.value !== null,
  set: (open) => {
    if (!open) actionSchedule.value = null
  }
})
const scopes = [
  { label: 'My schedules', value: 'mine' as const },
  { label: 'Team schedules', value: 'team' as const }
]
const activeStates: VestingScheduleState[] = [
  'upcoming',
  'cliff_locked',
  'accruing',
  'claimable',
  'fully_vested'
]
const scopedSchedules = computed(() => {
  if (selectedScope.value === 'team') return props.schedules
  const address = userStore.address?.toLowerCase()
  return props.schedules.filter((schedule) => schedule.member.toLowerCase() === address)
})
const counts = computed(() => ({
  all: scopedSchedules.value.length,
  active: scopedSchedules.value.filter((schedule) => activeStates.includes(schedule.state)).length,
  claimable: scopedSchedules.value.filter((schedule) => schedule.claimableAmount > 0n).length,
  completed: scopedSchedules.value.filter((schedule) => schedule.state === 'completed').length,
  cancelled: scopedSchedules.value.filter((schedule) => schedule.state === 'cancelled').length
}))
const statusOptions = computed(() => [
  { label: `All (${counts.value.all})`, value: 'all' },
  { label: `Active (${counts.value.active})`, value: 'active' },
  { label: `Claimable (${counts.value.claimable})`, value: 'claimable' },
  { label: `Completed (${counts.value.completed})`, value: 'completed' },
  { label: `Cancelled (${counts.value.cancelled})`, value: 'cancelled' }
])
const filteredSchedules = computed(() => {
  if (selectedStatus.value === 'all') return scopedSchedules.value
  if (selectedStatus.value === 'active') {
    return scopedSchedules.value.filter((schedule) => activeStates.includes(schedule.state))
  }
  if (selectedStatus.value === 'claimable') {
    return scopedSchedules.value.filter((schedule) => schedule.claimableAmount > 0n)
  }
  return scopedSchedules.value.filter((schedule) => schedule.state === selectedStatus.value)
})
const emptyTitle = computed(() =>
  selectedScope.value === 'mine' ? 'No schedules for this wallet' : 'No schedules to show'
)
const emptyDescription = computed(() =>
  selectedStatus.value === 'all'
    ? 'Created grants will appear here with their progress and next action.'
    : 'Choose another status to continue reviewing vesting schedules.'
)
const memberName = (address: string) =>
  teamStore.currentTeam?.members?.find(
    (member) => member.address.toLowerCase() === address.toLowerCase()
  )?.name || 'Team member'
const canRelease = (schedule: VestingSchedule) =>
  !isWriteDisabled.value &&
  schedule.active &&
  schedule.claimableAmount > 0n &&
  schedule.member.toLowerCase() === userStore.address?.toLowerCase()
const canStop = (schedule: VestingSchedule) =>
  !isWriteDisabled.value &&
  schedule.active &&
  teamStore.currentTeam?.ownerAddress.toLowerCase() === userStore.address?.toLowerCase()
const openActionReview = (kind: 'release' | 'stop', schedule: VestingSchedule) => {
  actionKind.value = kind
  actionSchedule.value = schedule
}
</script>
