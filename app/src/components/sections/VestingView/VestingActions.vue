<template>
  <div>
    <TeamArchivedTooltip v-if="isOwner" v-slot="{ disabled }">
      <UButton
        size="sm"
        color="primary"
        class="w-max"
        :disabled="disabled"
        data-test="createAddVesting"
        leading-icon="heroicons-outline:plus-circle"
        label="Create schedule"
        @click="addVestingModal = { mount: true, show: true }"
      />
    </TeamArchivedTooltip>

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
        <CreateVesting v-if="teamStore.currentTeamId" @closeAddVestingModal="handleClose" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import { useTeamStore, useUserDataStore } from '@/stores'

const addVestingModal = ref({ mount: false, show: false })
const userStore = useUserDataStore()
const teamStore = useTeamStore()
const isOwner = computed(
  () =>
    !!teamStore.currentTeam?.ownerAddress &&
    teamStore.currentTeam.ownerAddress.toLowerCase() === userStore.address?.toLowerCase()
)

const handleClose = () => {
  addVestingModal.value = { mount: false, show: false }
}
</script>
