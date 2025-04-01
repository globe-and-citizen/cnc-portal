<template>
  <div class="flex justify-between gap-5 w-full">
    <TeamDetails
      :team="team"
      @updateTeamModalOpen="updateTeamModalOpen"
      @deleteTeam="showDeleteTeamConfirmModal = true"
    />
    <ModalComponent v-model="showDeleteTeamConfirmModal">
      <h3 class="font-bold text-lg">Confirmation</h3>
      <hr class="" />
      <p class="py-4">
        Are you sure you want to delete the team
        <span class="font-bold">{{ team.name }}</span
        >?
      </p>
      <div class="modal-action justify-center">
        <ButtonUI
          variant="error"
          @click="deleteTeamAPI()"
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
        @updateTeam="() => updateTeamAPI()"
      />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import UpdateTeamForm from '@/components/sections/AdministrationView/forms/UpdateTeamForm.vue'
import TeamDetails from '@/components/sections/DashboardView/TeamDetails.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { Member } from '@/types'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'

const props = defineProps(['team'])
const emits = defineEmits(['getTeam'])
const showDeleteTeamConfirmModal = ref(false)
const showModal = ref(false)
const { addSuccessToast, addErrorToast } = useToastStore()

const route = useRoute()
const router = useRouter()
const inputs = ref<Member[]>([])

const updateTeamInput = ref<{ name: string; description: string }>({
  name: '',
  description: ''
})
// useFetch instance for updating team details
const {
  execute: updateTeamAPI,
  isFetching: teamIsUpdating,
  error: updateTeamError
} = useCustomFetch(`teams/${String(route.params.id)}`, {
  immediate: false
})
  .json()
  .put(updateTeamInput)
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
    emits('getTeam')
  }
})
// useFetch instance for deleting team
const {
  execute: deleteTeamAPI,
  isFetching: teamIsDeleting,
  error: deleteTeamError
} = useCustomFetch(`teams/${String(route.params.id)}`, {
  immediate: false
})
  .delete()
  .json()
// Watchers for deleting team
watch(deleteTeamError, () => {
  if (deleteTeamError.value) {
    addErrorToast(deleteTeamError.value || 'Failed to delete team')
  }
})
watch([() => teamIsDeleting.value, () => deleteTeamError.value], async () => {
  if (!teamIsDeleting.value && !deleteTeamError.value) {
    addSuccessToast('Team deleted successfully')
    showDeleteTeamConfirmModal.value = !showDeleteTeamConfirmModal.value
    router.push('/teams')
  }
})
const updateTeamModalOpen = async () => {
  showModal.value = true
  updateTeamInput.value.name = props.team.name
  updateTeamInput.value.description = props.team.description
  inputs.value = props.team.members
}
</script>
