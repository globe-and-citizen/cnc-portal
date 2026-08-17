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
    <!-- Offered wherever the owner meets a finished election: publishing is the
         only way to unblock the team, so it must not hide on the details page. -->
    <PublishResult
      v-if="awaitingPublication"
      :disabled="!isOwner"
      :disabled-reason="PUBLISH_OWNER_ONLY_TOOLTIP"
      :election-id="formattedElection?.id ?? 1"
    />
    <UTooltip :text="createElectionTooltip">
      <UButton
        v-if="!electionStatus || formattedElection?.resultsPublished || awaitingPublication"
        color="success"
        @click="emits('showCreateElectionModal')"
        :disabled="isCreateElectionDisabled"
        label="Create Election"
      />
    </UTooltip>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import PublishResult from '@/components/sections/AdministrationView/PublishResult.vue'
import { useRouter } from 'vue-router'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useBoDElections } from '@/composables/elections'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const PUBLISH_OWNER_ONLY_TOOLTIP = 'Only the owner can publish the results'
const AWAITING_PUBLICATION_TOOLTIP =
  'Publish the results of the previous election before creating a new one'

const props = defineProps<{ electionId: bigint }>()

const emits = defineEmits(['showCreateElectionModal'])

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const router = useRouter()
const currentElectionId = computed(() => props.electionId)
const { formattedElection, electionStatus, owner } = useBoDElections(currentElectionId)
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const isOwner = computed(() => userStore.address === owner.value)

// An election that is over but never published keeps blocking the team: no new
// election can be created until its results are out.
const awaitingPublication = computed(
  () =>
    Boolean(formattedElection.value) &&
    !formattedElection.value?.resultsPublished &&
    electionStatus.value?.text === 'Completed'
)

const isCreateElectionDisabled = computed(
  () => !isOwner.value || isWriteDisabled.value || awaitingPublication.value
)

const createElectionTooltip = computed(() => {
  if (archivedTooltip.value) return archivedTooltip.value
  if (!isOwner.value) return 'Only the owner can create elections'
  if (awaitingPublication.value) return AWAITING_PUBLICATION_TOOLTIP
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
