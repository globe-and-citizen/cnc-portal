<template>
  <div class="flex justify-between gap-5 w-full">
    <TeamDetails
      :team="team"
      @updateTeamModalOpen="updateTeamModalOpen"
      @deleteTeam="showDeleteTeamConfirmModal = true"
    />
    <ModalComponent v-model="showDeleteTeamConfirmModal">
      <DeleteConfirmForm :isLoading="teamIsDeleting" @deleteItem="async () => deleteTeamAPI()">
        Are you sure you want to delete the team
        <span class="font-bold">{{ team.name }}</span
        >?
      </DeleteConfirmForm>
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
import UpdateTeamForm from '@/components/sections/SingleTeamView/forms/UpdateTeamForm.vue'
import DeleteConfirmForm from '@/components/forms/DeleteConfirmForm.vue'
import TeamDetails from '@/components/sections/SingleTeamView/TeamDetails.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { Member, Team } from '@/types'
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

const updateTeamInput = ref<Partial<Team>>({
  name: '',
  description: '',
  bankAddress: ''
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
  updateTeamInput.value.bankAddress = props.team.bankAddress
  inputs.value = props.team.members
}
</script>
