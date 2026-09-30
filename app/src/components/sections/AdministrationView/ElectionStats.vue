<template>
  <div class="flex flex-col items-stretch justify-between gap-4 md:flex-row">
    <ElectionStatsCard
      :data="`${formattedElection?.seatCount ?? 0} / ${formattedElection?.candidates ?? 0}`"
      icon="users"
      color="primary"
      title="Seat/Candidates"
    />
    <ElectionStatsCard
      :data="formatDate(formattedElection?.startDate ?? new Date())"
      icon="calendar-date-range"
      color="success"
      title="Start Date"
    />
    <ElectionStatsCard
      :data="formatDate(formattedElection?.endDate ?? new Date())"
      icon="stop"
      color="error"
      title="End Date"
    />
    <ElectionStatsCard
      :data="`${formattedElection?.votesCast ?? 0} / ${formattedElection?.voters ?? 0}`"
      icon="archive-box"
      color="info"
      title="Votes Cast/Voters"
    />
  </div>
</template>
<script setup lang="ts">
import ElectionStatsCard from '@/components/sections/AdministrationView/ElectionStatsCard.vue'
import { formatDateTime } from '@/utils/format'

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

const formatDate = (date: Date) => formatDateTime(date)
</script>
