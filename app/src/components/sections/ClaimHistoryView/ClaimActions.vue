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
      <IconifyIcon icon="heroicons:trash" class="w-4 h-4 text-error" />
    </UButton>

    <!-- Edit Modal -->
    <UModal v-model:open="showEditModal">
      <template #body>
        <EditClaims :claim="claim" @close="showEditModal = false" />
      </template>
    </UModal>
    <!-- Delete Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #body>
        <DeleteClaimModal :claim="claim" @close="showDeleteModal = false" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import DeleteClaimModal from '@/components/sections/CashRemunerationView/DeleteClaimModal.vue'
import type { Claim } from '@/types'

defineProps<{
  claim: Claim
}>()

const showEditModal = ref(false)
const showDeleteModal = ref(false)
</script>
