<template>
  <UModal
    v-model:open="showUpdateModal"
    title="Update Company Details"
    description="Update your company name and description to keep your profile current and accurate"
  >
    <UButton
      size="sm"
      color="secondary"
      icon="i-lucide-edit"
      label="Update"
      data-test="team-meta-update-open"
      @click="prefillUpdateForm"
    />
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
            :loading="Boolean(teamIsUpdating)"
            :disabled="Boolean(teamIsUpdating)"
            label="Save changes"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { z } from 'zod'
import { useTeamStore } from '@/stores'
import { useUpdateTeamMutation } from '@/queries/team.queries'

const showUpdateModal = ref(false)
const updateTeamInput = ref({ name: '', description: '' })
const teamStore = useTeamStore()
const toast = useToast()

const updateTeamSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters')
})

const {
  isPending: teamIsUpdating,
  error: updateTeamError,
  mutate: updateTeamMutate,
  reset
} = useUpdateTeamMutation()

function getRequiredTeamId(): string | null {
  const teamId = teamStore.currentTeamId
  if (!teamId) {
    toast.add({ title: 'Company ID is required', color: 'error' })
    return null
  }
  return String(teamId)
}

function executeUpdateTeam() {
  const teamId = getRequiredTeamId()
  if (!teamId) return
  updateTeamMutate(
    { pathParams: { id: teamId }, body: { ...updateTeamInput.value } },
    {
      onSuccess: () => {
        toast.add({ title: 'Company updated successfully', color: 'success' })
        showUpdateModal.value = false
        reset()
      }
    }
  )
}

function prefillUpdateForm() {
  const meta = teamStore.currentTeamMeta.data
  updateTeamInput.value.name = meta?.name || ''
  updateTeamInput.value.description = meta?.description || ''
}
</script>
