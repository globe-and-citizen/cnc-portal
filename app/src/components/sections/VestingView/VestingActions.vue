<template>
  <div>
    <UButton
      v-if="teamStore.currentTeam?.ownerAddress === userStore.address"
      size="sm"
      color="primary"
      class="w-max"
      @click="addVestingModal = { mount: true, show: true }"
      data-test="createAddVesting"
      leading-icon="heroicons-outline:plus-circle"
      label="Create schedule"
    />

    <UModal
      v-if="addVestingModal.mount"
      v-model:open="addVestingModal.show"
      :close="{
        onClick: () => {
          addVestingModal = { mount: false, show: false }
        }
      }"
      title="Add Vesting Schedule"
      description="Create a minute-precise share vesting schedule for a team member."
      :ui="{ content: 'sm:max-w-5xl' }"
    >
      <template #body>
        <CreateVesting
          v-if="teamStore.currentTeamId"
          @closeAddVestingModal="handleClose"
          @reload="handleReload"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import { useTeamStore, useUserDataStore } from '@/stores'

defineProps<{
  reloadKey: number
}>()

const emit = defineEmits(['reload'])

const addVestingModal = ref({ mount: false, show: false })
const userStore = useUserDataStore()
const teamStore = useTeamStore()

const handleReload = () => {
  emit('reload') // Propagate reload up
}

const handleClose = () => {
  addVestingModal.value = { mount: false, show: false }
}
</script>
