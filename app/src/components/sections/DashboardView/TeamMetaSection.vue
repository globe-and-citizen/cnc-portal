<template>
  <div class="flex justify-between gap-5 w-full">
    <div
      class="collapse collapse-arrow border static"
      :class="`${currentTeam?.ownerAddress == address ? 'bg-green-100' : 'bg-blue-100'}`"
    >
      <input type="checkbox" />
      <div class="collapse-title text-xl font-medium">
        <div class="flex items-center justify-center">
          <h2 class="pl-5">{{ currentTeam?.name }}</h2>
          <div
            class="badge badge-lg badge-primary flex items-center justify-center ml-2"
            v-if="currentTeam?.ownerAddress == address"
          >
            Owner
          </div>
          <div class="badge badge-sm badge-secondary ml-2" v-else>Employee</div>
        </div>
      </div>
      <div class="collapse-content">
        <p class="pl-5">{{ currentTeam?.description }}</p>

        <div class="pl-5 flex flex-row justify-center gap-2 mt-5 items-center">
          <UButton
            size="sm"
            color="secondary"
            v-if="currentTeam?.ownerAddress == address"
            @click="updateTeamModalOpen"
            label="Update"
          />
          <UButton
            size="sm"
            color="error"
            v-if="currentTeam?.ownerAddress == address"
            @click="showDeleteTeamConfirmModal = true"
            label="Delete"
          />
        </div>
      </div>
    </div>
    <UModal v-model:open="showDeleteTeamConfirmModal">
      <template #body>
        <h3 class="font-bold text-lg">Confirmation</h3>
        <hr class="" />
        <p class="py-4">
          Are you sure you want to delete the team
          <span class="font-bold">{{ teamStore.currentTeamMeta.data?.name }}</span
          >?
        </p>
        <div class="modal-action justify-center">
          <UButton
            color="error"
            data-test="delete-team-button"
            @click="deleteTeam()"
            :loading="teamIsDeleting"
            :disabled="teamIsDeleting"
            label="Delete"
          />
          <UButton
            color="primary"
            variant="outline"
            @click="showDeleteTeamConfirmModal = false"
            label="Cancel"
          />
        </div>
      </template>
    </UModal>
    <UModal v-model:open="showModal">
      <template #body>
        <h1 class="font-bold text-2xl">Update Team Details</h1>
        <hr class="" />
        <UForm
          :schema="updateTeamSchema"
          :state="updateTeamInput"
          @submit="executeUpdateTeam"
          class="flex flex-col gap-5 mt-4"
        >
          <UFormField name="name" label="Team Name" required>
            <UInput v-model="updateTeamInput.name" class="w-full" />
          </UFormField>
          <UFormField name="description" label="Description" required>
            <UInput v-model="updateTeamInput.description" class="w-full" />
          </UFormField>
          <div class="modal-action justify-center">
            <UButton
              type="submit"
              color="primary"
              :loading="!!teamIsUpdating"
              :disabled="!!teamIsUpdating"
              label="Submit"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import type { Member } from '@/types'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import { useUpdateTeamMutation, useDeleteTeamMutation } from '@/queries/team.queries'

const showDeleteTeamConfirmModal = ref(false)
const showModal = ref(false)
const teamStore = useTeamStore()
const currentTeam = computed(() => teamStore.currentTeamMeta.data)
const { address } = useUserDataStore()
const { addSuccessToast, addErrorToast } = useToastStore()

const router = useRouter()
const inputs = ref<Member[]>([])

const updateTeamInput = ref({ name: '', description: '' })

const updateTeamSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters')
})

const {
  isPending: teamIsUpdating,
  error: updateTeamError,
  mutate: updateTeamMutate
} = useUpdateTeamMutation()

const executeUpdateTeam = () => {
  updateTeamMutate(
    {
      pathParams: { id: teamStore.currentTeamId || '' },
      body: {
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
    { pathParams: { teamId: String(teamId) } },
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
