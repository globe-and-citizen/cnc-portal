<template>
  <div class="flex justify-between gap-2">
    <div
      v-if="
        formattedElection &&
        !formattedElection?.resultsPublished &&
        !router.currentRoute.value.fullPath.includes('bod-elections-details')
      "
      @click="
        () => {
          if (electionStatus.text == 'Completed') {
            // showResultsModal = true
            emits('showResultsModal')
          } else {
            router.push(`/teams/${teamStore.currentTeamId}/administration/bod-elections-details`)
          }
        }
      "
      class="btn btn-md"
      :class="{ 'btn-primary': electionStatus.text === 'Active' }"
    >
      {{
        electionStatus.text === 'Active'
          ? 'Vote Now'
          : electionStatus.text == 'Completed'
            ? 'View Results'
            : 'View Details'
      }}
    </div>
    <PublishResult
      v-if="
        formattedElection &&
        !Boolean(formattedElection?.resultsPublished) &&
        electionStatus.text === 'Completed'
      "
      :election-id="formattedElection?.id ?? 1"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import PublishResult from '@/components/sections/AdministrationView/PublishResult.vue'
import { useRouter } from 'vue-router'
import { useTeamStore } from '@/stores'

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

const emits = defineEmits(['showResultsModal'])

const teamStore = useTeamStore()
const router = useRouter()
const now = ref(new Date())

// Election status
const electionStatus = computed(() => {
  if (!formattedElection) return { text: 'No Election' }

  if (now.value < formattedElection?.startDate) {
    return { text: 'Upcoming' }
  }
  if (
    now.value > formattedElection?.endDate ||
    formattedElection?.votesCast === formattedElection?.seatCount
  ) {
    return { text: 'Completed' }
  }
  return { text: 'Active' }
})
</script>
