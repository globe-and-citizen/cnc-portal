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
        <span class="font-bold">{{ teamStore.currentTeamMeta.data?.name }}</span
        >?
      </p>
      <div class="modal-action justify-center">
        <ButtonUI
          variant="error"
          data-test="delete-team-button"
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
        :teamIsUpdating="!!teamIsUpdating"
        v-model="updateTeamInput"
        @updateTeam="executeUpdateTeam"
      />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import UpdateTeamForm from '@/components/sections/DashboardView/forms/UpdateTeamForm.vue'
import TeamDetails from '@/components/sections/DashboardView/TeamDetails.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import type { Member } from '@/types'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { useTeamStore } from '@/stores'
import { useUpdateTeamMutation, useDeleteTeamMutation } from '@/queries/team.queries'

const showDeleteTeamConfirmModal = ref(false)
const showModal = ref(false)
const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

const router = useRouter()
const inputs = ref<Member[]>([])

const updateTeamInput = ref<{ name: string; description: string }>({
  name: '',
  description: ''
})

const {
  isPending: teamIsUpdating,
  error: updateTeamError,
  mutate: updateTeamMutate
} = useUpdateTeamMutation()

const executeUpdateTeam = () => {
  updateTeamMutate(
    {
      id: teamStore.currentTeamId || '',
      teamData: {
        name: updateTeamInput.value.name,
        description: updateTeamInput.value.description
      }
    },
    {
      onSuccess: () => {
        addSuccessToast('Team updated successfully')
        showModal.value = false
      },
      onError: () => {
        addErrorToast(updateTeamError.value?.message || 'Failed to update team')
      }
    }
  )
}

// Mutation for deleting team
const {
  mutate: deleteTeamMutate,
  isPending: teamIsDeleting,
  error: deleteTeamError
} = useDeleteTeamMutation()

const deleteTeam = async () => {
  const teamId = teamStore.currentTeamId
  if (!teamId) {
    addErrorToast('Team ID is required')
    return
  }

  deleteTeamMutate(
    { teamId: String(teamId) },
    {
      onSuccess: async () => {
        addSuccessToast('Team deleted successfully')
        showDeleteTeamConfirmModal.value = false
        // wait for 3 seconds to show the toast before navigating
        await new Promise((resolve) => setTimeout(resolve, 3000))
        router.push('/teams')
      },
      onError: () => {
        addErrorToast(deleteTeamError.value?.message || 'Failed to delete team')
      }
    }
  )
}

const updateTeamModalOpen = async () => {
  showModal.value = true
  updateTeamInput.value.name = teamStore.currentTeamMeta.data?.name || ''
  updateTeamInput.value.description = teamStore.currentTeamMeta.data?.description || ''
  inputs.value = teamStore.currentTeamMeta.data?.members || []
}
</script>
