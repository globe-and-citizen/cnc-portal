<template>
  <div class="flex justify-between gap-2">
    <UTooltip :text="voteNowTooltip">
      <UButton
        v-if="
          formattedElection &&
          !formattedElection?.resultsPublished &&
          !router.currentRoute.value.fullPath.includes('bod-elections-details')
        "
        @click="goToElectionDetails"
        :color="electionStatus?.text === 'Active' ? 'primary' : undefined"
        :disabled="isVoteNowDisabled"
      >
      {{
        electionStatus?.text === 'Active'
          ? 'Vote Now'
          : electionStatus?.text == 'Completed'
            ? 'View Results'
            : 'View Details'
      }}
      </UButton>
    </UTooltip>
    <PublishResult
      v-if="
        showPublishResult &&
        formattedElection &&
        !Boolean(formattedElection?.resultsPublished) &&
        electionStatus?.text === 'Completed'
      "
      :disabled="userStore.address !== owner"
      :election-id="formattedElection?.id ?? 1"
    />
    <UTooltip :text="createElectionTooltip">
      <UButton
        v-if="!electionStatus || formattedElection?.resultsPublished"
        color="success"
        @click="emits('showCreateElectionModal')"
        :disabled="userStore.address != owner || isWriteDisabled"
        label="Create Election"
      />
    </UTooltip>
  </div>
</template>
<script setup lang="ts">
import { computed, inject } from 'vue'
import PublishResult from '@/components/sections/AdministrationView/PublishResult.vue'
import { useRouter } from 'vue-router'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useBoDElections } from '@/composables/elections'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const props = defineProps<{ electionId: bigint }>()

const emits = defineEmits(['showCreateElectionModal'])
const showPublishResult = inject('showPublishResultBtn')

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const router = useRouter()
const currentElectionId = computed(() => props.electionId)
const { formattedElection, electionStatus, owner } = useBoDElections(currentElectionId)
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const createElectionTooltip = computed(() => {
  if (archivedTooltip.value) return archivedTooltip.value
  if (userStore.address != owner.value) return 'Only the owner can create elections'
  return undefined
})

const isVoteNowDisabled = computed(
  () => isWriteDisabled.value && electionStatus.value?.text === 'Active'
)

const voteNowTooltip = computed(() => {
  if (isVoteNowDisabled.value) return archivedTooltip.value
  return undefined
})

function goToElectionDetails() {
  if (isVoteNowDisabled.value) return
  router.push(`/teams/${teamStore.currentTeamId}/administration/bod-elections-details`)
}
</script>
