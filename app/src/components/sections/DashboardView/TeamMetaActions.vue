<template>
  <div class="mt-5 flex flex-row items-center justify-center gap-2 pl-5">
    <template v-if="isOwner">
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

      <UModal
        v-model:open="showArchiveTeamConfirmModal"
        :title="isArchived ? 'Unarchive Company' : 'Archive Company'"
        :description="
          isArchived
            ? 'This action will make the company visible and usable again.'
            : 'This action will remove the company from the dashboard and prevent it from being used.'
        "
      >
        <UButton
          size="sm"
          :color="isArchived ? 'success' : 'warning'"
          :icon="isArchived ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
          :label="isArchived ? 'Unarchive' : 'Archive'"
        />
        <template #body>
          <UAlert v-if="archiveTeamError" color="error" variant="soft" class="mb-4" />
          <p>
            Are you sure you want to {{ isArchived ? 'unarchive' : 'archive' }} the company
            <span class="font-bold">{{ currentTeam?.name }}</span
            >?
          </p>
          <div class="mt-4 flex justify-center gap-2">
            <UButton
              :color="isArchived ? 'success' : 'error'"
              data-test="archive-team-button"
              @click="isArchived ? unarchiveTeam() : archiveTeam()"
              :loading="teamIsArchiving || teamIsUnarchiving"
              :disabled="teamIsArchiving || teamIsUnarchiving"
              :label="isArchived ? 'Unarchive' : 'Archive'"
            />
            <UButton
              color="primary"
              variant="outline"
              @click="showArchiveTeamConfirmModal = false"
              label="Cancel"
            />
          </div>
        </template>
      </UModal>
    </template>

    <UModal
      v-model:open="showVisibilityTeamConfirmModal"
      :title="isVisible ? 'Hide Company' : 'Show Company'"
      :description="
        isVisible
          ? 'This action will hide the company from your dashboard only.'
          : 'This action will show the company on your dashboard again.'
      "
    >
      <UButton
        size="sm"
        :color="isVisible ? 'success' : 'warning'"
        :icon="isVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :label="isVisible ? 'Hide' : 'Show'"
      />
      <template #body>
        <UAlert v-if="hideTeamError" color="error" variant="soft" class="mb-4" />
        <p>
          Are you sure you want to {{ isVisible ? 'hide' : 'show' }} the company
          <span class="font-bold">{{ currentTeam?.name }}</span
          >?
        </p>
        <div class="mt-4 flex justify-center gap-2">
          <UButton
            :color="isVisible ? 'success' : 'error'"
            data-test="visibility-team-button"
            @click="isVisible ? hideTeam() : showTeam()"
            :loading="teamIsHiding || teamIsShowing"
            :disabled="teamIsHiding || teamIsShowing"
            :label="isVisible ? 'Hide' : 'Show'"
          />
          <UButton
            color="primary"
            variant="outline"
            @click="showVisibilityTeamConfirmModal = false"
            label="Cancel"
          />
        </div>
      </template>
    </UModal>

    <template v-if="isOwner">
      <UModal
        v-model:open="showDeleteTeamConfirmModal"
        title="Confirmation"
        description="This action cannot be undone. Please confirm that you want to permanently delete this company."
      >
        <UButton size="sm" color="error" icon="i-lucide-trash" label="Delete" />
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
            <span class="font-bold">{{ currentTeam?.name }}</span
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Team } from '@/types/team'
import { useTeamMetaActions } from '@/composables/useTeamMetaActions'

const props = defineProps<{
  currentTeam: Team | null | undefined
  isOwner: boolean
}>()

const currentTeam = computed(() => props.currentTeam)
const isOwner = computed(() => props.isOwner)
const isArchived = computed(() => Boolean(props.currentTeam?.isArchived ?? props.currentTeam?.isArchived))
const isVisible = computed(() => props.currentTeam?.isVisible ?? true)

const {
  showDeleteTeamConfirmModal,
  showArchiveTeamConfirmModal,
  showVisibilityTeamConfirmModal,
  showUpdateModal,
  updateTeamInput,
  updateTeamSchema,
  teamIsUpdating,
  updateTeamError,
  teamIsDeleting,
  deleteTeamError,
  teamIsArchiving,
  archiveTeamError,
  teamIsUnarchiving,
  teamIsHiding,
  hideTeamError,
  teamIsShowing,
  executeUpdateTeam,
  deleteTeam,
  archiveTeam,
  unarchiveTeam,
  hideTeam,
  showTeam,
  prefillUpdateForm
} = useTeamMetaActions()
</script>
