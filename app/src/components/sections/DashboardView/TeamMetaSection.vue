<template>
  <div class="flex w-full justify-between gap-5">
    <div
      class="collapse-arrow collapse static border"
      :class="`${currentTeam?.ownerAddress == address ? 'bg-green-100' : 'bg-blue-100'}`"
    >
      <input type="checkbox" />
      <div class="collapse-title text-xl font-medium">
        <div class="flex items-center justify-center">
          <h2 class="pl-5">{{ currentTeam?.name }}</h2>
          <div
            class="badge badge-lg badge-primary ml-2 flex items-center justify-center"
            v-if="currentTeam?.ownerAddress == address"
          >
            Owner
          </div>
          <div class="badge badge-sm badge-secondary ml-2" v-else>Employee</div>
        </div>
      </div>
      <div class="collapse-content">
        <p class="pl-5">{{ currentTeam?.description }}</p>

        <div class="mt-5 flex flex-row items-center justify-center gap-2 pl-5">
          <template v-if="currentTeam?.ownerAddress == address">
            <UModal
              v-model:open="showModal"
              title="Update Company Details"
              description="Update your company name and description to keep your profile current and accurate"
            >
              <UButton size="sm" color="secondary" label="Update" @click="prefillUpdateForm" />
              <template #body>
                <UAlert
                  v-if="updateTeamError"
                  color="error"
                  variant="soft"
                  :description="updateTeamError.message"
                  class="mb-4"
                />
                <UForm
                  :schema="updateTeamSchema"
                  :state="updateTeamInput"
                  @submit="executeUpdateTeam"
                  class="flex flex-col gap-5"
                >
                  <UFormField
                    name="name"
                    label="Company Name"
                    help="Give your company a unique, recognizable name"
                    required
                  >
                    <UInput v-model="updateTeamInput.name" placeholder="Acme Corp" class="w-full" />
                  </UFormField>
                  <UFormField
                    name="description"
                    label="Description"
                    help="Briefly describe your company's purpose"
                    :hint="`${updateTeamInput.description.length} / 200`"
                  >
                    <UTextarea
                      v-model="updateTeamInput.description"
                      placeholder="Enter a short description"
                      class="w-full"
                      :rows="3"
                    />
                  </UFormField>
                  <div class="flex justify-end">
                    <UButton
                      type="submit"
                      color="primary"
                      class="w-32 justify-center"
                      :loading="!!teamIsUpdating"
                      :disabled="!!teamIsUpdating"
                      label="Save changes"
                    />
                  </div>
                </UForm>
              </template>
            </UModal>

            <UModal
              v-model:open="showDeleteTeamConfirmModal"
              title="Confirmation"
              description="This action cannot be undone. Please confirm that you want to permanently delete this company."
            >
              <UButton size="sm" color="error" label="Delete" />
              <template #body>
                <UAlert
                  v-if="deleteTeamError"
                  color="error"
                  variant="soft"
                  :description="deleteTeamError.message"
                  class="mb-4"
                />
                <p>
                  Are you sure you want to delete the company
                  <span class="font-bold">{{ teamStore.currentTeamMeta.data?.name }}</span
                  >?
                </p>
                <div class="mt-4 flex justify-center gap-2">
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
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import type { Member } from '@/types'
import { useRouter } from 'vue-router'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import { useUpdateTeamMutation, useDeleteTeamMutation } from '@/queries/team.queries'

const showDeleteTeamConfirmModal = ref(false)
const showModal = ref(false)
const teamStore = useTeamStore()
const currentTeam = computed(() => teamStore.currentTeamMeta.data)
const { address } = useUserDataStore()
const toast = useToast()

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
const {
  mutate: deleteTeamMutate,
  isPending: teamIsDeleting,
  error: deleteTeamError
} = useDeleteTeamMutation()

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
        toast.add({ title: 'Company updated successfully', color: 'success' })
        showModal.value = false
      }
    }
  )
}

const deleteTeam = async () => {
  const teamId = teamStore.currentTeamId
  if (!teamId) {
    toast.add({ title: 'Company ID is required', color: 'error' })
    return
  }

  deleteTeamMutate(
    { pathParams: { teamId: String(teamId) } },
    {
      onSuccess: async () => {
        toast.add({ title: 'Company deleted successfully', color: 'success' })
        showDeleteTeamConfirmModal.value = false
        router.push('/teams')
      }
    }
  )
}

const prefillUpdateForm = () => {
  updateTeamInput.value.name = teamStore.currentTeamMeta.data?.name || ''
  updateTeamInput.value.description = teamStore.currentTeamMeta.data?.description || ''
  inputs.value = teamStore.currentTeamMeta.data?.members || []
}
</script>
