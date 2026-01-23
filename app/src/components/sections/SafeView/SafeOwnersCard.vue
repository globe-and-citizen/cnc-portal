<template>
  <CardComponent title="Safe Owners">
    <template #card-action>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <ButtonUI
            size="sm"
            variant="primary"
            @click="showAddSignerModal = true"
            :disabled="!teamStore.currentTeam?.safeAddress || !isConnectedUserOwner"
            data-test="add-signer-button"
            class="flex items-center gap-1"
          >
            <IconifyIcon icon="heroicons:user-plus" class="w-4 h-4" />
            Add Signer
          </ButtonUI>
          <ButtonUI
            size="sm"
            variant="secondary"
            @click="showUpdateThresholdModal = true"
            :disabled="isLoading || !isConnectedUserOwner"
            :loading="isLoading"
            data-test="update-threshold-button"
            class="flex items-center gap-1"
          >
            <IconifyIcon icon="heroicons:shield-check" class="w-4 h-4" />
            Update Threshold
          </ButtonUI>
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="owners.length === 0" class="text-center py-8">
      <div class="text-gray-500">No owners found</div>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(owner, index) in owners"
        :key="owner"
        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        :class="{ 'ring-2 ring-primary/20': isCurrentUserAddress(owner) }"
        data-test="owner-item"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span class="text-sm font-medium text-primary">{{ index + 1 }}</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <AddressToolTip :address="owner" />
              <span
                v-if="isCurrentUserAddress(owner)"
                class="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
              >
                You
              </span>
            </div>
            <div class="text-xs text-gray-500 mt-1">Owner</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <RemoveOwnerButton
            :owner-address="owner"
            :safe-address="teamStore.currentTeam?.safeAddress!"
            :total-owners="owners.length"
            :threshold="threshold"
            :is-connected-user-owner="isConnectedUserOwner"
          />
        </div>
      </div>
    </div>
    <!-- Modals -->
    <AddSignerModal
      v-model="showAddSignerModal"
      :safe-address="teamStore.currentTeam?.safeAddress!"
      :current-owners="owners"
      :current-threshold="threshold"
    />

    <UpdateThresholdModal
      v-model="showUpdateThresholdModal"
      :safe-address="teamStore.currentTeam?.safeAddress!"
      :current-owners="owners"
      :current-threshold="threshold"
      @threshold-updated="handleThresholdUpdated"
    />
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAccount } from '@wagmi/vue'

import { Icon as IconifyIcon } from '@iconify/vue'

// Components
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import AddSignerModal from '@/components/sections/SafeView/forms/AddSignerModal.vue'
import UpdateThresholdModal from '@/components/sections/SafeView/forms/UpdateThresholdModal.vue'
import RemoveOwnerButton from './RemoveOwnerButton.vue'

// Composables and utilities
import { useSafeData } from '@/composables/safe'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()

const { address: connectedAddress } = useAccount()

// Use the Safe data composable for owners and threshold
const { owners, threshold, isLoading } = useSafeData(
  computed(() => teamStore.currentTeam?.safeAddress)
)

// Computed properties
const isConnectedUserOwner = computed(() => {
  if (!connectedAddress.value || !owners.value?.length) return false

  return owners.value.some((owner) => owner.toLowerCase() === connectedAddress.value!.toLowerCase())
})

const isCurrentUserAddress = (ownerAddress: string): boolean => {
  return connectedAddress.value?.toLowerCase() === ownerAddress.toLowerCase()
}

// Modal state
const showAddSignerModal = ref(false)
const showUpdateThresholdModal = ref(false)

const handleThresholdUpdated = () => {
  showUpdateThresholdModal.value = false
}
</script>
