<template>
  <div class="flex justify-between gap-5 w-full">
    <TeamDetails
      @updateTeamModalOpen="updateTeamModalOpen"
      @deleteTeam="showDeleteTeamConfirmModal = true"
    />
    <ModalComponent v-model="showDeleteTeamConfirmModal">
      <h3 class="font-bold text-lg">Confirmation</h3>
      <hr class="" />
      <p class="py-4">
        Are you sure you want to delete the team
        <span class="font-bold">{{ currentTeam?.name }}</span
        >?
      </p>
      <div class="modal-action justify-center">
        <ButtonUI
          variant="error"
          @click="deleteTeam()"
          :loading="teamIsDeleting"
          :disabled="teamIsDeleting"
          >Delete
        </ButtonUI>
        <ButtonUI variant="primary" outline @click="() => (showDeleteTeamConfirmModal = false)"
          >Cancel</ButtonUI
        >
      </div>
    </ModalComponent>
    <ModalComponent v-model="showModal">
      <UpdateTeamForm
        :teamIsUpdating="teamIsUpdating"
        v-model="updateTeamInput"
        @updateTeam="updateTeamAPI()"
      />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UpdateTeamForm from '@/components/sections/DashboardView/forms/UpdateTeamForm.vue'
import TeamDetails from '@/components/sections/DashboardView/TeamDetails.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { Member } from '@/types'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { useTeamStore } from '@/stores'
import { storeToRefs } from 'pinia'

const showDeleteTeamConfirmModal = ref(false)
const showModal = ref(false)
const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

// const route = useRoute()
const router = useRouter()
const inputs = ref<Member[]>([])
const { currentTeam } = storeToRefs(teamStore)
const teamUrl = computed(() => `/teams/${currentTeam.value?.id}` || '')

const updateTeamInput = ref<{ name: string; description: string }>({
  name: '',
  description: ''
})

// useFetch instance for updating team details
const {
  execute: updateTeamAPI,
  isFetching: teamIsUpdating,
  error: updateTeamError
} = useCustomFetch(teamUrl, {
  immediate: false
})
  .json()
  .put(updateTeamInput)

// useFetch instance for deleting team
const {
  execute: deleteTeamAPI,
  isFetching: teamIsDeleting,
  error: deleteTeamError,
  statusCode: deleteStatus
} = useCustomFetch(teamUrl, {
  immediate: false
})
  .delete()
  .json()

// Watchers for updating team details
watch(updateTeamError, () => {
  if (updateTeamError.value) {
    addErrorToast(updateTeamError.value || 'Failed to update team')
  }
})

watch([() => teamIsUpdating.value, () => updateTeamError.value], async () => {
  if (!teamIsUpdating.value && !updateTeamError.value) {
    addSuccessToast('Team updated successfully')
    showModal.value = false
    await teamStore.currentTeamMeta.executeFetchTeam()
  }
})

const deleteTeam = async () => {
  await deleteTeamAPI()
  if (deleteStatus.value === 200) {
    addSuccessToast('Team deleted successfully')
    showDeleteTeamConfirmModal.value = false
    teamStore.teamsMeta.reloadTeams()
    router.push('/teams')
  } else if (deleteTeamError.value) {
    addErrorToast('Failed to delete team')
  }
}
const updateTeamModalOpen = async () => {
  showModal.value = true
  updateTeamInput.value.name = currentTeam.value?.name || ''
  updateTeamInput.value.description = currentTeam.value?.description || ''
  inputs.value = currentTeam.value?.members || []
}
</script>
