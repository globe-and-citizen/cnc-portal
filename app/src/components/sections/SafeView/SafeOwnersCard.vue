<template>
  <UCard class="h-full" data-test="safe-owners-card">
    <template #header>
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="font-semibold">Owners and threshold</h3>
          <p class="mt-1 text-sm text-gray-500">
            Who can approve actions and how many approvals are required.
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <UButton
            color="primary"
            icon="i-lucide-user-plus"
            label="Add signer"
            :disabled="!address || !isConnectedUserOwner"
            :title="managePermissionHint"
            class="justify-center"
            data-test="add-signer-button"
            @click="showAddSignerModal = true"
          />
          <UButton
            color="secondary"
            icon="i-lucide-shield-check"
            label="Change threshold"
            :disabled="isLoading || !isConnectedUserOwner"
            :loading="isLoading"
            :title="managePermissionHint"
            class="justify-center"
            data-test="update-threshold-button"
            @click="showUpdateThresholdModal = true"
          />
        </div>
      </div>
    </template>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Signer details could not be loaded"
      description="Try again before proposing an owner or threshold change."
      data-test="safe-owners-error"
    >
      <template #actions>
        <UButton
          color="error"
          variant="outline"
          size="xs"
          label="Try again"
          data-test="retry-safe-owners-button"
          @click="retryOwners"
        />
      </template>
    </UAlert>

    <div
      v-else-if="isLoading"
      class="flex items-center justify-center gap-3 py-8 text-sm text-gray-500"
      role="status"
      aria-live="polite"
    >
      <div class="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      Loading owners and threshold…
    </div>

    <div v-else-if="safeInfo?.owners.length === 0" class="py-8 text-center">
      <p class="font-medium">No Safe owners found</p>
      <p class="mt-1 text-sm text-gray-500">
        Open the Safe application to verify its configuration.
      </p>
    </div>

    <template v-else>
      <div class="mb-4 grid grid-cols-2 gap-3">
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
          <p class="text-xs text-gray-500">Signers</p>
          <p class="mt-1 text-lg font-semibold">{{ safeInfo?.owners.length ?? '—' }}</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
          <p class="text-xs text-gray-500">Approvals required</p>
          <p class="mt-1 text-lg font-semibold">{{ safeInfo?.threshold ?? '—' }}</p>
        </div>
      </div>

      <UAlert
        class="mb-4"
        :color="isConnectedUserOwner ? 'success' : 'info'"
        variant="soft"
        :title="isConnectedUserOwner ? 'You are a Safe signer' : 'You can review this policy'"
        :description="roleDescription"
        data-test="safe-owner-role-notice"
      />

      <ul class="space-y-3" aria-label="Safe signers">
        <li
          v-for="(owner, index) in safeInfo?.owners"
          :key="owner"
          class="flex flex-col gap-3 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-gray-800/60"
          :class="{ 'ring-primary/30 ring-2': isCurrentUserAddress(owner) }"
          data-test="owner-item"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            >
              <span class="text-primary text-sm font-medium">{{ index + 1 }}</span>
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <AddressTooltip :address="owner" slice />
                <UBadge v-if="isCurrentUserAddress(owner)" color="primary" variant="soft" size="sm">
                  Connected wallet
                </UBadge>
              </div>
              <p class="mt-1 text-xs text-gray-500">{{ getOwnerDisplayName(owner) }}</p>
            </div>
          </div>
          <RemoveOwnerButton
            :owner-address="owner"
            :safe-address="address as Address"
            :total-owners="safeInfo?.owners.length ?? 0"
            :threshold="safeInfo?.threshold ?? 1"
            :is-connected-user-owner="isConnectedUserOwner"
          />
        </li>
      </ul>
    </template>

    <AddSignerModal
      v-model="showAddSignerModal"
      :safe-address="address as Address"
      :current-owners="safeInfo?.owners || []"
      :current-threshold="safeInfo?.threshold || 1"
      @signer-added="handleSignerUpdated"
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
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import AddSignerModal from '@/components/sections/SafeView/forms/AddSignerModal.vue'
import UpdateThresholdModal from '@/components/sections/SafeView/forms/UpdateThresholdModal.vue'
import RemoveOwnerButton from './RemoveOwnerButton.vue'
import { useGetSafeInfoQuery } from '@/queries/safe.queries'
import { useTeamStore, useUserDataStore } from '@/stores'

interface Props {
  address?: string
}

const props = withDefaults(defineProps<Props>(), { address: '' })
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()

const {
  data: safeInfo,
  error,
  isLoading,
  refetch
} = useGetSafeInfoQuery({
  pathParams: { safeAddress: computed(() => props.address) }
})

const isConnectedUserOwner = computed(() => {
  if (!userDataStore.address || !safeInfo.value?.owners?.length) return false
  return safeInfo.value.owners.some(
    (owner) => owner.toLowerCase() === userDataStore.address?.toLowerCase()
  )
})

const managePermissionHint = computed(() =>
  isConnectedUserOwner.value
    ? 'This creates a Safe transaction that follows the current approval threshold.'
    : 'Only a Safe signer can propose owner or threshold changes.'
)

const roleDescription = computed(() =>
  isConnectedUserOwner.value
    ? 'Owner and threshold changes become Safe transactions and still need the current number of approvals.'
    : 'Connect a Safe signer wallet to propose changes. Team membership alone does not grant signer permission.'
)

const isCurrentUserAddress = (ownerAddress: string) =>
  userDataStore.address?.toLowerCase() === ownerAddress.toLowerCase()

const getOwnerDisplayName = (ownerAddress: string) => {
  const member = teamStore.currentTeam?.members?.find(
    (teamMember) => teamMember.address.toLowerCase() === ownerAddress.toLowerCase()
  )
  return member ? member.name : 'External signer'
}

const showAddSignerModal = ref(false)
const showUpdateThresholdModal = ref(false)

const handleSignerUpdated = async () => {
  await refetch()
}

const handleThresholdUpdated = async () => {
  await refetch()
}

const retryOwners = () => {
  void refetch()
}
</script>
