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
          router.push(`/teams/${teamStore.currentTeamId}/administration/bod-elections-details`)
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
        showPublishResult &&
        formattedElection &&
        !Boolean(formattedElection?.resultsPublished) &&
        electionStatus.text === 'Completed'
      "
      :disabled="userStore.address !== teamStore.currentTeam?.ownerAddress"
      :election-id="formattedElection?.id ?? 1"
    />
    <ButtonUI
      v-if="electionStatus.text === 'No Election'"
      variant="success"
      @click="emits('showCreateElectionModal')"
    >
      Create Election
    </ButtonUI>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import PublishResult from '@/components/sections/AdministrationView/PublishResult.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useRouter } from 'vue-router'
import { useTeamStore, useUserDataStore } from '@/stores'

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
  } | null
}>()

const emits = defineEmits(['showCreateElectionModal'])
const showPublishResult = inject('showPublishResultBtn')

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const router = useRouter()
const now = ref(new Date())

// Election status
const electionStatus = computed(() => {
  if (!formattedElection || formattedElection?.resultsPublished) return { text: 'No Election' }

  if (now.value < formattedElection?.startDate) {
    return { text: 'Upcoming' }
  }
  if (
    now.value > formattedElection?.endDate ||
    formattedElection?.votesCast === formattedElection?.voters
  ) {
    return { text: 'Completed' }
  }
  return { text: 'Active' }
})
</script>
