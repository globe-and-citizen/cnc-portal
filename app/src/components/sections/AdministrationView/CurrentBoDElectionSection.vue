<template>
  <CardComponent title="Current Election">
    <template #card-action>
      <div class="flex justify-between">
        <div class="flex justify-between gap-2">
          <ButtonUI
            variant="primary"
            size="md"
            @click="showCreateElectionModal = !showCreateElectionModal"
            data-test="create-proposal"
          >
            Create Election
          </ButtonUI>
          <ButtonUI>
            View Election
          </ButtonUI>
        </div>
        <ModalComponent v-model="showCreateElectionModal">
          <!-- <VotingManagement :team="team" /> -->
          <CreateElectionForm :is-loading="false"/>
        </ModalComponent>
      </div>
    </template>
		<!-- Status and Countdown -->
		<div class="flex items-center justify-start gap-2 mb-6">
			<span class="px-2 py-1 text-xs font-medium rounded-full" 
						:class="electionStatus.class">
				{{ electionStatus.text }}
			</span>
			<span class="text-sm text-gray-600">
				Ends in {{ timeRemaining }}
			</span>
		</div>
    <div>
      <!-- Election Title -->
      <h2 class="text-2xl text-center font-semibold mb-4">{{ electionData.title }}</h2>

      <!-- Stats Row -->
      <div class="flex justify-between items-stretch gap-4">
        <!-- Candidates Stat -->
        <div class="flex-1 flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div class="p-3 bg-blue-50 rounded-full">
            <IconifyIcon icon="heroicons:user-group" class="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Candidates</p>
            <p class="text-xl font-semibold text-gray-900">
              {{ electionData.candidates.length }}
            </p>
          </div>
        </div>

        <!-- End Date Stat -->
        <div class="flex-1 flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div class="p-3 bg-green-50 rounded-full">
            <IconifyIcon icon="heroicons:calendar" class="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Ends</p>
            <p class="text-xl font-semibold text-gray-900">
              {{ formatDate(electionData.endDate) }}
            </p>
          </div>
        </div>

        <!-- Votes Stat -->
        <div class="flex-1 flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div class="p-3 bg-purple-50 rounded-full">
            <IconifyIcon icon="heroicons:chart-bar" class="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Votes Cast</p>
            <p class="text-xl font-semibold text-gray-900">
              {{ votesCast }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue';
import { Icon as IconifyIcon } from '@iconify/vue'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateElectionForm from './forms/CreateElectionForm.vue';

// Mock votes data - replace with real data
const votesCast = ref(1428)
const showCreateElectionModal = ref(false)

// Calculate time remaining
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

const electionData = {
  title: 'Q1 2025 Board of Directors Election',
  description: 'Election for the next Board of Directors will be held on December 1, 2023.',
  candidates: [
    { name: 'Alice Johnson', address: '0x1234567890abcdef1234567890abcdef12345678' },
    { name: 'Bob Smith', address: '0xabcdef1234567890abcdef1234567890abcdef12' },
    { name: 'Charlie Brown', address: '0x7890abcdef1234567890abcdef12345678901234' }
  ],
  startDate: new Date('2023-12-01T00:00:00Z'),
  endDate: new Date('2023-12-15T23:59:59Z')
}

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000 * 60) // Update every minute
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

const timeRemaining = computed(() => {
  const diff = electionData.endDate.getTime() - now.value.getTime()
  
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
  if (now.value < electionData.startDate) {
    return { text: 'Upcoming', class: 'bg-yellow-100 text-yellow-800' }
  }
  if (now.value > electionData.endDate) {
    return { text: 'Completed', class: 'bg-gray-100 text-gray-800' }
  }
  return { text: 'Active', class: 'bg-green-100 text-green-800' }
})

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