<template>
  <!-- Stats Row -->
  <div class="flex justify-between items-stretch gap-4">
    <!-- Candidates Stat -->
    <ElectionStatsCard
      :data="`${formattedElection?.seatCount ?? 0} / ${formattedElection?.candidates ?? 0}`"
      icon="users"
      bg-color="bg-purple-200"
      text-color="text-purple-600"
      title="Seat/Candidates"
      color="purple"
    />

    <!-- Start Date Stat -->
    <ElectionStatsCard
      :data="formatDate(formattedElection?.startDate ?? new Date())"
      icon="calendar-date-range"
      bg-color="bg-green-200"
      text-color="text-green-600"
      color="green"
      title="Start Date"
    />

    <!-- End Date Stat -->
    <ElectionStatsCard
      :data="formatDate(formattedElection?.endDate ?? new Date())"
      icon="stop"
      bg-color="bg-red-200"
      text-color="text-red-600"
      title="End Date"
      color="red"
    />

    <!-- Votes Stat -->
    <ElectionStatsCard
      :data="`${formattedElection?.votesCast ?? 0} / ${formattedElection?.voters ?? 0}`"
      icon="archive-box"
      bg-color="bg-blue-200"
      text-color="text-blue-600"
      title="Votes Cast/Voters"
      color="'blue'"
    />
  </div>
</template>
<script setup lang="ts">
import ElectionStatsCard from '@/components/sections/AdministrationView/ElectionStatsCard.vue'

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

// Format date as "Dec 15, 2023"
const formatDate = (date: Date) => {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit'
  })
}
</script>

<style scoped>
/* Add slight spacing between stats on smaller screens */
@media (max-width: 768px) {
  .flex.justify-between {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
