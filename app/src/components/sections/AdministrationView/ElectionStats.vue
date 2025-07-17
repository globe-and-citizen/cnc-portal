<template>
  <!-- Stats Row -->
  <div class="flex justify-between items-stretch gap-4">
    <!-- Candidates Stat -->
    <ElectionStatsCard
      :data="formattedElection?.candidates"
      icon="user-group"
      color="blue"
      title="Candidates"
    />
    <!-- <div class="flex-1 flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-300">
      <div class="p-3 bg-blue-50 rounded-full">
        <IconifyIcon icon="heroicons:user-group" class="h-6 w-6 text-blue-600" />
      </div>
      <div>
        <p class="text-sm font-medium text-gray-500">Candidates</p>
        <p class="text-xl font-semibold text-gray-900">
          {{ formattedElection?.candidates }}
        </p>
      </div>
    </div> -->

    <!-- Start Date Stat -->
    <ElectionStatsCard
      :data="formatDate(formattedElection?.startDate ?? new Date())"
      icon="calendar"
      color="green"
      title="Starts"
    />
    <!-- <div
      class="flex-1 flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-300"
    >
      <div class="p-3 bg-green-50 rounded-full">
        <IconifyIcon icon="heroicons:calendar" class="h-6 w-6 text-green-600" />
      </div>
      <div>
        <p class="text-sm font-medium text-gray-500">Starts</p>
        <p class="text-xl font-semibold text-gray-900">
          {{ formatDate(formattedElection?.startDate ?? new Date()) }}
        </p>
      </div>
    </div> -->

    <!-- End Date Stat -->
    <ElectionStatsCard
      :data="formatDate(formattedElection?.endDate ?? new Date())"
      icon="calendar-days"
      color="red"
      title="Ends"
    />
    <!-- <div
      class="flex-1 flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-300"
    >
      <div class="p-3 bg-red-50 rounded-full">
        <IconifyIcon icon="heroicons:calendar-days" class="h-6 w-6 text-red-600" />
      </div>
      <div>
        <p class="text-sm font-medium text-gray-500">Ends</p>
        <p class="text-xl font-semibold text-gray-900">
          {{ formatDate(formattedElection?.endDate ?? new Date()) }}
        </p>
      </div>
    </div> -->

    <!-- Votes Stat -->
    <ElectionStatsCard
      :data="formattedElection?.votesCast"
      icon="chart-bar"
      color="purple"
      title="Votes Cast"
    />
    <!-- <div
      class="flex-1 flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-300"
    >
      <div class="p-3 bg-purple-50 rounded-full">
        <IconifyIcon icon="heroicons:chart-bar" class="h-6 w-6 text-purple-600" />
      </div>
      <div>
        <p class="text-sm font-medium text-gray-500">Votes Cast</p>
        <p class="text-xl font-semibold text-gray-900">
          {{ formattedElection?.votesCast }}
        </p>
      </div>
    </div> -->
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
  }
}>()

// Format date as "Dec 15, 2023"
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
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
