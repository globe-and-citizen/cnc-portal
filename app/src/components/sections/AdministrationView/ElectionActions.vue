<template>
  <div class="flex justify-between gap-2">
    <ButtonUI
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
      :variant="electionStatus?.text === 'Active' ? 'primary' : undefined"
    >
      {{
        electionStatus?.text === 'Active'
          ? 'Vote Now'
          : electionStatus?.text == 'Completed'
            ? 'View Results'
            : 'View Details'
      }}
    </ButtonUI>
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
    <div class="relative group">
      <ButtonUI
        v-if="!electionStatus || formattedElection?.resultsPublished"
        variant="success"
        @click="emits('showCreateElectionModal')"
        :disabled="userStore.address != owner"
      >
        Create Election
      </ButtonUI>
      <span
        v-if="userStore.address != owner"
        class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-sm bg-green-900 text-white rounded opacity-0 group-hover:opacity-100 transition"
        style="white-space: nowrap"
      >
        Only the owner can create elections
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, inject } from 'vue'
import PublishResult from '@/components/sections/AdministrationView/PublishResult.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useRouter } from 'vue-router'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useBoDElections } from '@/composables'

const props = defineProps<{ electionId: bigint }>()

const emits = defineEmits(['showCreateElectionModal'])
const showPublishResult = inject('showPublishResultBtn')

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const router = useRouter()
const currentElectionId = computed(() => props.electionId)
const { formattedElection, electionStatus, owner } = useBoDElections(currentElectionId)
</script>
