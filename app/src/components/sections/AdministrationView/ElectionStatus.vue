<template>
  <!-- Status and Countdown -->
  <div class="flex items-center justify-start gap-2 mb-6">
    <span class="px-2 py-1 text-xs font-medium rounded-full" :class="electionStatus.class">
      {{ electionStatus.text }}
    </span>
    <span class="text-sm text-gray-600"> Ends in {{ timeRemaining }} </span>
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
    return { text: 'Upcoming', class: 'bg-yellow-100 text-yellow-800' }
  }
  if (
    now.value > formattedElection.endDate ||
    formattedElection.votesCast === formattedElection.seatCount
  ) {
    return { text: 'Completed', class: 'bg-gray-100 text-gray-800' }
  }
  return { text: 'Active', class: 'bg-green-100 text-green-800' }
})
</script>
