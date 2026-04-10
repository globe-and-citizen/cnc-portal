<template>
  <UCard class="h-full">
    <template #header>
      <div class="flex items-center justify-between">
        <span>Safe Owners</span>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UButton
              color="primary"
              @click="showAddSignerModal = true"
              :disabled="!address || !isConnectedUserOwner"
              data-test="add-signer-button"
              class="flex items-center gap-1"
            >
              <IconifyIcon icon="heroicons:user-plus" class="h-4 w-4" />
              Add Signer
            </UButton>
            <UButton
              color="secondary"
              @click="showUpdateThresholdModal = true"
              :disabled="isLoading || !isConnectedUserOwner"
              :loading="isLoading"
              data-test="update-threshold-button"
              class="flex items-center gap-1"
            >
              <IconifyIcon icon="heroicons:shield-check" class="h-4 w-4" />
              Threshold
            </UButton>
          </div>
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <div class="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
    </div>

    <div v-else-if="safeInfo?.owners.length === 0" class="py-8 text-center">
      <div class="text-gray-500">No owners found</div>
    </div>

    <div v-else class="mt-3 space-y-3">
      <div
        v-for="(owner, index) in safeInfo?.owners"
        :key="owner"
        class="flex items-center justify-between rounded-lg bg-gray-50 p-3"
        :class="{ 'ring-primary/20 ring-2': isCurrentUserAddress(owner) }"
        data-test="owner-item"
      >
        <div class="flex items-center gap-3">
          <div class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
            <span class="text-primary text-sm font-medium">{{ index + 1 }}</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <AddressToolTip :address="owner" slice />
              <span
                v-if="isCurrentUserAddress(owner)"
                class="bg-primary/10 text-primary rounded-sm px-2 py-1 text-xs"
              >
                You
              </span>
            </div>
            <div class="mt-1 text-xs text-gray-500">{{ getOwnerDisplayName(owner) }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <RemoveOwnerButton
            :owner-address="owner"
            :safe-address="address as Address"
            :total-owners="safeInfo?.owners.length ?? 0"
            :threshold="safeInfo?.threshold ?? 1"
            :is-connected-user-owner="isConnectedUserOwner"
          />
        </div>
      </div>
    </div>
    <!-- Modals -->
    <AddSignerModal
      v-model="showAddSignerModal"
      :safe-address="address as Address"
      :current-owners="safeInfo?.owners || []"
      :current-threshold="safeInfo?.threshold || 1"
    />

    <UpdateThresholdModal
      v-model:open="showUpdateThresholdModal"
      :safe-address="address as Address"
      :current-owners="safeInfo?.owners || []"
      :current-threshold="safeInfo?.threshold || 1"
      @threshold-updated="handleThresholdUpdated"
    />
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAccount } from '@wagmi/vue'

import { Icon as IconifyIcon } from '@iconify/vue'

// Components
import AddressToolTip from '@/components/AddressToolTip.vue'
import AddSignerModal from '@/components/sections/SafeView/forms/AddSignerModal.vue'
import UpdateThresholdModal from '@/components/sections/SafeView/forms/UpdateThresholdModal.vue'
import RemoveOwnerButton from './RemoveOwnerButton.vue'
import { type Address } from 'viem'

// Composables and utilities

import { useGetSafeInfoQuery } from '@/queries/safe.queries'
import { useTeamStore } from '@/stores'

interface Props {
  address?: string
}

const props = withDefaults(defineProps<Props>(), {
  address: ''
})

const { address: connectedAddress } = useAccount()
const teamStore = useTeamStore()

const {
  data: safeInfo,
  error,
  isLoading,
  refetch
} = useGetSafeInfoQuery({
  pathParams: { safeAddress: computed(() => props.address) }
})

// Computed properties
const isConnectedUserOwner = computed(() => {
  if (!connectedAddress.value || !safeInfo.value?.owners?.length) return false

  return safeInfo.value.owners.some(
    (owner) => owner.toLowerCase() === connectedAddress.value!.toLowerCase()
  )
})

const isCurrentUserAddress = (ownerAddress: string): boolean => {
  return connectedAddress.value?.toLowerCase() === ownerAddress.toLowerCase()
}

const getOwnerDisplayName = (ownerAddress: string): string => {
  const teamMembers = teamStore.currentTeam?.members || []

  const member = teamMembers.find((m) => m.address.toLowerCase() === ownerAddress.toLowerCase())

  return member ? member.name : 'Owner'
}
// Modal state
const showAddSignerModal = ref(false)
const showUpdateThresholdModal = ref(false)

const handleThresholdUpdated = async () => {
  await refetch()
}

// Error handling
watch(error, (newError) => {
  if (newError) {
    console.error('Error loading safe info:', newError)
  }
})
</script>
