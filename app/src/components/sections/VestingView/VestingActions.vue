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
      label="add vesting"
    />

    <ModalComponent
      v-model="addVestingModal.show"
      v-if="addVestingModal.mount"
      @reset="() => (addVestingModal = { mount: false, show: false })"
    >
      <CreateVesting
        v-if="teamStore.currentTeamId"
        :tokenAddress="(teamStore.getContractAddressByType('InvestorV1') as Address) ?? ''"
        @closeAddVestingModal="handleClose"
        @reload="handleReload"
        :reloadKey="reloadKey"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import type { Address } from 'viem'

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
