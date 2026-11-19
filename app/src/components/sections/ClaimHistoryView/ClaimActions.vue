<template>
  <div class="flex items-center gap-1">
    <UButton
      variant="ghost"
      size="xs"
      @click="openEditModal"
      data-test="edit-claim-button"
      icon="heroicons:pencil-square"
    />
    <UButton
      variant="ghost"
      size="xs"
      @click="showDeleteModal = true"
      data-test="delete-claim-button"
    >
      <IconifyIcon icon="heroicons:trash" class="text-error h-4 w-4" />
    </UButton>

    <!-- Edit Modal -->
    <UModal
      v-model:open="showEditModal"
      title="Edit Claim"
      :description="`Edit your claim for the week. You can update the hours worked, memo, and attached files. Remember to save your changes.`"
    >
      <template #body>
        <EditClaims :claim="claim" :week-claims="weekClaims" @close="showEditModal = false" />
      </template>
    </UModal>
    <!-- Delete Modal -->
    <UModal v-model:open="showDeleteModal" title="Delete Claim">
      <template #body>
        <DeleteClaimConfirmation :claim="claim" @close="showDeleteModal = false" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useToast } from '@nuxt/ui/composables'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import DeleteClaimConfirmation from '@/components/sections/CashRemunerationView/DeleteClaimConfirmation.vue'
import { useTeamStore } from '@/stores'
import type { Claim } from '@/types'

const props = defineProps<{
  claim: Claim
  weekClaims?: Claim[]
  weeklyGoals?: string | null
}>()

const teamStore = useTeamStore()
const toast = useToast()
const showEditModal = ref(false)
const showDeleteModal = ref(false)

/** The API enforces the same rule; this only spares the member a form they cannot save. */
const isMissingRequiredWeeklyGoals = computed(
  () => !!teamStore.currentTeamMeta.data?.requireWeeklyGoals && !props.weeklyGoals?.trim()
)

function openEditModal() {
  if (isMissingRequiredWeeklyGoals.value) {
    toast.add({
      title: 'Weekly goals required',
      description: 'Submit your weekly goals for this week before editing a claim.',
      color: 'warning'
    })
    return
  }
  showEditModal.value = true
}
</script>
