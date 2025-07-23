<template>
  <!-- Status and Countdown -->
  <div class="flex items-center justify-start gap-2">
    <span class="badge badge-lg flex items-center gap-1 px-2 py-1 text-sm h-10" :class="badgeClass">
      <span class="w-3 h-3 rounded-full inline-block" :class="dotClass"></span>
      <span class="font-medium">{{ electionStatus.text }}</span>
      <span class="mx-1">•</span>
      {{ timeRemaining }} left
    </span>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const { formattedElection } = defineProps<{
  formattedElection: {
    id: number
    title: string
    description: string
    createdBy: string
    startDate: Date
    endDate: Date
    seatCount: number
    resultsPublished: boolean
    votesCast: number
    candidates: number
    voters: number
  }
}>()

// Calculate time remaining
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000 * 60) // Update every minute
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

const timeRemaining = computed(() => {
  if (!formattedElection) return 'No election data available'

  const diff = formattedElection.endDate.getTime() - formattedElection.startDate.getTime()

  if (diff <= 0) return 'election ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'}`

  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`

  const minutes = Math.floor(diff / (1000 * 60))
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
})

// Election status
const electionStatus = computed(() => {
  if (!formattedElection) return { text: 'No Election', class: 'bg-gray-100 text-gray-800' }

  if (now.value < formattedElection.startDate) {
    return {
      text: 'Upcoming',
      color: 'warning'
    }
  }
  if (
    now.value > formattedElection.endDate ||
    formattedElection.votesCast === formattedElection.voters
  ) {
    return {
      text: 'Completed',
      color: 'neutral'
    }
  }
  return {
    text: 'Active',
    color: 'success'
  }
})

const badgeClass = computed(() => `badge-${electionStatus.value.color} badge-outline`)
const dotClass = computed(() => {
  switch (electionStatus.value.color) {
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
