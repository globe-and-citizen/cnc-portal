<template>
  <div class="flex items-center gap-1">
    <ButtonUI variant="ghost" size="xs" @click="openEditModal" data-test="edit-claim-button">
      <IconifyIcon icon="heroicons:pencil-square" class="w-4 h-4" />
    </ButtonUI>
    <ButtonUI variant="ghost" size="xs" @click="openDeleteModal" data-test="delete-claim-button">
      <IconifyIcon icon="heroicons:trash" class="w-4 h-4 text-error" />
    </ButtonUI>

    <!-- Edit Modal -->
    <EditClaims
      v-model:show="showEditModal"
      v-if="showEditModal && teamId"
      :claim="claim"
      :team-id="teamId"
      @close="closeEditModal"
    />

    <!-- Delete Modal -->
    <DeleteClaimModal
      v-model:show="showDeleteModal"
      v-if="showDeleteModal"
      :claim="claim"
      :query-key="weeklyClaimQueryKey"
      @close="closeDeleteModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import DeleteClaimModal from '@/components/sections/CashRemunerationView/DeleteClaimModal.vue'
import type { Claim } from '@/types'
import { useTeamStore } from '@/stores'

defineProps<{
  claim: Claim
}>()

const teamStore = useTeamStore()
const teamId = computed(() => teamStore.currentTeam?.id)
const weeklyClaimQueryKey = computed(() => ['weekly-claims', teamId.value])

// Modal states
const showEditModal = ref(false)
const showDeleteModal = ref(false)

// Modal handlers
const openEditModal = () => {
  showEditModal.value = true
}

const openDeleteModal = () => {
  showDeleteModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

defineExpose({
  openEditModal,
  openDeleteModal,
  closeEditModal,
  closeDeleteModal
})
</script>
