<template>
  <h2 class="text-xl">Past Elections</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <PastBoDElectionCard
      v-for="(election, index) in pastElections"
      :key="index"
      :election="election"
    />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import PastBoDElectionCard from './PastBoDElectionCard.vue'

const pastElections = ref([
  {
    title: 'Q4 2023 Board Election',
    endDate: new Date('2023-12-15'),
    candidates: 5,
    totalVotes: 1842,
    electedMembers: ['Alice Johnson', 'Bob Smith', 'Charlie Brown']
  },
  {
    title: 'Q3 2023 Committee Election',
    endDate: new Date('2023-09-20'),
    candidates: 3,
    totalVotes: 956,
    electedMembers: ['Diana Prince', 'Ethan Hunt']
  },
  {
    title: 'Q2 2023 Audit Election',
    endDate: new Date('2023-06-10'),
    candidates: 4,
    totalVotes: 1203,
    electedMembers: ['Frank Ocean', 'Grace Hopper', 'Henry Ford']
  }
])
</script>
