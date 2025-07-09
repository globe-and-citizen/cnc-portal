<template>
  <CardComponent title="Candidates">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <ElectionDetailsCard
        v-for="(election, index) in pastElections"
        :key="index"
        :election="election"
      />
    </div>
  </CardComponent>
</template>

<script lang="ts" setup>
import CardComponent from '@/components/CardComponent.vue'
import ElectionDetailsCard from './BoDElectionDetailsCard.vue'
import { ref } from 'vue'

const boardOfDirectors = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'Alice Johnson',
    role: 'Chairperson' /*,
		imageUrl: 'https://example.com/images/alice.jpg'*/
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'Bob Smith',
    role: 'Vice Chairperson' /*,
		imageUrl: 'https://example.com/images/bob.jpg'*/
  },
  {
    address: '0x7890abcdef1234567890abcdef12345678901234',
    name: 'Charlie Brown',
    role: 'Treasurer' /*,
		imageUrl: 'https://example.com/images/charlie.jpg'*/
  },
  {
    address: '0x4567890abcdef1234567890abcdef1234567890',
    name: 'Diana Prince',
    role: 'Secretary' /*,
		imageUrl: 'https://example.com/images/diana.jpg'*/
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef56',
    name: 'Ethan Hunt' /*,
		imageUrl: 'https://example.com/images/ethan.jpg'*/
  }
]

const pastElections = ref([
  {
    title: 'Q4 2023 Board Election',
    endDate: new Date('2023-12-15'),
    candidates: 5,
    currentVotes: 142,
    totalVotes: 1842,
    electedMembers: ['Alice Johnson', 'Bob Smith', 'Charlie Brown'],
    user: boardOfDirectors[0]
  },
  {
    title: 'Q3 2023 Committee Election',
    endDate: new Date('2023-09-20'),
    candidates: 3,
    currentVotes: 78,
    totalVotes: 956,
    electedMembers: ['Diana Prince', 'Ethan Hunt'],
    user: boardOfDirectors[1]
  },
  {
    title: 'Q2 2023 Audit Election',
    endDate: new Date('2023-06-10'),
    candidates: 4,
    currentVotes: 95,
    totalVotes: 1203,
    electedMembers: ['Frank Ocean', 'Grace Hopper', 'Henry Ford'],
    user: boardOfDirectors[2]
  },
  {
    title: 'Q1 2023 Audit Election',
    endDate: new Date('2023-06-10'),
    candidates: 4,
    currentVotes: 87,
    totalVotes: 1203,
    electedMembers: ['Frank Ocean', 'Grace Hopper', 'Henry Ford'],
    user: boardOfDirectors[3]
  }
])
</script>
