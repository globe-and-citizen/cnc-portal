<template>
  <UCard>
    <UAlert
      v-if="error"
      color="warning"
      title="Unable to refresh owner information"
      description="Previously loaded information may be outdated. Try again."
      data-test="contract-owner-error"
      class="mb-4"
    >
      <template #actions>
        <UButton
          label="Try again"
          :loading="isFetching"
          :disabled="isFetching"
          data-test="contract-owner-retry"
          @click="refetch({ cancelRefetch: false })"
        />
      </template>
    </UAlert>
    <div v-if="ownerUser" class="flex items-center justify-between">
      <div class="text-lg text-gray-500">
        <div class="flex items-center gap-4">
          <UAvatar
            :src="ownerUser.imageUrl"
            :alt="`${ownerUser.name || 'User'} avatar`"
            :text="ownerUser.name?.slice(0, 1).toUpperCase() || 'U'"
            icon="i-lucide-user"
            size="lg"
            data-test="contract-owner-avatar"
          />
          <div>
            <span class="text-gray-500">Owner name:</span>
            <p class="font-bold text-gray-800" data-test="contract-owner-name">
              {{ ownerUser.name || 'User' }}
            </p>
          </div>
        </div>
      </div>

      <div class="text-lg text-gray-500">
        <span class="flex items-center gap-4">
          Owner address:
          <AddressTooltip :address="ownerUser.address" />
        </span>
      </div>
    </div>

    <div v-else class="flex items-center justify-center py-4">
      <span v-if="isLoading" class="text-gray-500" data-test="contract-owner-loading"
        >Loading owner information...</span
      >
      <span v-else class="text-gray-500" data-test="contract-owner-unavailable"
        >Owner information unavailable.</span
      >
    </div>
  </UCard>
</template>

<script setup lang="ts">
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import { useTeamStore } from '@/stores/'
import { computed } from 'vue'
import type { Address } from 'viem'
import { useContractOwner } from '@/composables/contracts/reads'
import { getContractOwnerIdentity } from '@/utils/contracts/presentation'

const props = defineProps<{ contractAddress?: Address }>()
const teamStore = useTeamStore()
const {
  data: owner,
  error,
  isLoading,
  isFetching,
  refetch
} = useContractOwner(() => props.contractAddress)
const ownerUser = computed(() =>
  owner.value
    ? getContractOwnerIdentity(
        owner.value,
        teamStore.currentTeam?.members ?? [],
        teamStore.getContractAddressByType('BoardOfDirectors')
      )
    : undefined
)
</script>
