<template>
  <div>
    <ButtonUI
      v-if="team?.ownerAddress === userAddress"
      size="sm"
      variant="primary"
      class="w-max"
      @click="addVestingModal = true"
      data-test="createAddVesting"
    >
      <IconifyIcon icon="heroicons-outline:plus-circle" class="size-6" /> add vesting
    </ButtonUI>

    <ModalComponent v-model="addVestingModal" size="lg">
      <CreateVesting
        v-if="team?.id"
        :tokenAddress="sherToken?.address ?? ''"
        @closeAddVestingModal="handleClose"
        @reload="handleReload"
        :reloadKey="reloadKey"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import { useTeamStore, useUserDataStore } from '@/stores'

defineProps<{
  reloadKey: number
}>()

const emit = defineEmits(['reload'])

const addVestingModal = ref(false)
const userStore = useUserDataStore()
const teamStore = useTeamStore()

const handleReload = () => {
  console.log('vesting actions reload calledd === ')
  emit('reload') // Propagate reload up
}

const handleClose = () => {
  addVestingModal.value = false
}

const userAddress = computed(() => userStore.address)
const team = computed(() => teamStore.currentTeam)
const sherToken = computed(() =>
  team.value?.teamContracts?.find((contract) => contract.type === 'InvestorsV1')
)
</script>
