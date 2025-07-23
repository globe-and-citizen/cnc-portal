<template>
  <div class="flex flex-col gap-5 max-w-5xl w-full">
    <h4 class="font-bold text-lg">Review Vesting Details</h4>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-base-200 rounded-lg">
      <div class="flex flex-col gap-2">
        <span class="text-xs text-gray-500">Member</span>
        <span class="font-medium">{{
          props.vesting.member.name || props.vesting.member.address
        }}</span>

        <span class="text-xs text-gray-500">Total Amount</span>
        <span class="font-medium">{{ props.vesting.totalAmount }} Tokens</span>
      </div>

      <div class="flex flex-col gap-1"></div>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">Start Date</span>
        <span class="font-medium">{{ formatDate(props.vesting.startDate) }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">Duration</span>
        <span class="font-medium">{{ formatDuration() }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">Cliff Period</span>
        <span class="font-medium">{{ props.vesting.cliff }} days</span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">Vesting Rate</span>
        <span class="font-medium"
          >{{
            (props.vesting.totalAmount / props.vesting.durationInDays).toFixed(2)
          }}
          tokens/day</span
        >
      </div>
    </div>

    <div class="flex justify-end gap-2 mt-4">
      <ButtonUI variant="ghost" size="sm" @click="$emit('back')"> Back to Edit </ButtonUI>
      <ButtonUI
        variant="primary"
        size="sm"
        :loading="loading"
        :disabled="loading"
        @click="$emit('confirm')"
        data-test="confirm-btn"
      >
        Confirm & Create
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { format } from '@/utils/dayUtils'
import ButtonUI from '@/components/ButtonUI.vue'
import { type VestingCreation } from '@/types/vesting'
const props = defineProps<{
  vesting: VestingCreation
  loading: boolean
}>()

defineEmits(['back', 'confirm'])

function formatDate(date: Date) {
  return format(date, 'dd/MM/yyyy')
}

function formatDuration() {
  const parts = []
  if (props.vesting.duration.years) parts.push(`${props.vesting.duration.years} years`)
  if (props.vesting.duration.months) parts.push(`${props.vesting.duration.months} months`)
  if (props.vesting.duration.days) parts.push(`${props.vesting.duration.days} days`)
  return parts.join(', ') || '0 days'
}
</script>
