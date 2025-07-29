<template>
  <!-- Status and Countdown -->
  <div v-if="electionStatus" class="flex items-center justify-start gap-2">
    <span class="badge badge-lg flex items-center gap-1 px-2 py-1 text-sm h-10" :class="badgeClass">
      <span class="w-3 h-3 rounded-full inline-block" :class="dotClass"></span>
      <span class="font-medium">{{ electionStatus.text }}</span>
      <span v-if="electionStatus.text !== 'Completed'" class="flex items-center gap-1">
        <span class="mx-1">•</span>
        {{ timeRemaining }} left
      </span>
    </span>
  </div>
</template>
<script setup lang="ts">
import type { Election } from '@/types'
import { useCountdown } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useBoDElections } from '@/composables'

const { electionId } = defineProps<{ electionId: bigint }>()
const currentElectionId = computed(() => electionId)

const { formattedElection, leftToStart, leftToEnd, electionStatus } =
  useBoDElections(currentElectionId)

// const now = ref(new Date())

// const timeLeft = computed(() => {
//   const startDate = formattedElection.startDate
//   const endDate = formattedElection.endDate
//   return {
//     toStart: Math.max(0, Math.floor((startDate.getTime() - now.value.getTime()) / 1000)),
//     toEnd: Math.max(0, Math.floor((endDate.getTime() - now.value.getTime()) / 1000))
//   }
// })

// const { remaining: leftToStart } = useCountdown(timeLeft.value.toStart, {
//   immediate: true
// })

// const { remaining: leftToEnd } = useCountdown(timeLeft.value.toEnd, {
//   immediate: true
// })

// const electionStatus = computed(() => {
//   if (leftToStart.value > 0) return { text: 'Upcoming', color: 'warning' }

//   if (formattedElection.voters !== formattedElection.votesCast && leftToEnd.value > 0)
//     return { text: 'Active', color: 'success' }

//   return { text: 'Completed', color: 'neutral' }
// })

const timeRemaining = computed(() => {
  if (!formattedElection.value || !electionStatus.value) return 'No election data available'

  let days
  let hours
  let minutes

  if (electionStatus.value.text === 'Upcoming') {
    days = Math.floor(leftToStart.value / (60 * 60 * 24))
    if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'}`

    const hours = Math.floor(leftToStart.value / (60 * 60))
    if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`

    const minutes = Math.floor(leftToStart.value / 60)
    if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`

    return `${leftToStart.value} seconds`
  }

  if (electionStatus.value.text === 'Active') {
    days = Math.floor(leftToEnd.value / (60 * 60 * 24))
    if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'}`

    hours = Math.floor(leftToEnd.value / (60 * 60))
    if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`

    minutes = Math.floor(leftToEnd.value / 60)
    if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`

    return `${leftToEnd.value} seconds`
  }

  return 'Election ended'
})

const badgeClass = computed(() => {
  return electionStatus.value
    ? `badge-${electionStatus.value.color} badge-outline`
    : 'badge-neutral badge-outline'
})
const dotClass = computed(() => {
  switch (electionStatus.value?.color) {
    case 'warning':
      return 'bg-yellow-500'
    case 'error':
      return 'bg-red-500'
    case 'neutral':
      return 'bg-gray-500'
    case 'success':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
})
</script>
