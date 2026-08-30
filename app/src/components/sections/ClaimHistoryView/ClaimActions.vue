<template>
  <div class="flex items-center gap-1">
    <UButton
      variant="ghost"
      size="xs"
      @click="showEditModal = true"
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
import { ref } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import DeleteClaimConfirmation from '@/components/sections/CashRemunerationView/DeleteClaimConfirmation.vue'
import type { Claim } from '@/types'

defineProps<{
  claim: Claim
  weekClaims?: Claim[]
}>()

const showEditModal = ref(false)
const showDeleteModal = ref(false)
</script>
