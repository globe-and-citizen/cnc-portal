<template>
  <CardComponent>
    <template #header>
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">Safe Owners</h3>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">
            {{ safeInfo?.threshold || 0 }} of {{ owners.length }} required
          </span>
          <ButtonUI
            size="sm"
            variant="secondary"
            class="flex items-center gap-1"
            @click="handleOpenSafeApp"
            data-test="manage-owners-button"
          >
            <IconifyIcon icon="heroicons-outline:cog-6-tooth" class="w-4 h-4" />
            Manage
          </ButtonUI>
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <div class="text-red-600 text-sm">{{ error }}</div>
    </div>

    <div v-else-if="owners.length === 0" class="text-center py-8">
      <div class="text-gray-500">No owners found</div>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(owner, index) in owners"
        :key="owner"
        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        data-test="owner-item"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span class="text-sm font-medium text-primary">{{ index + 1 }}</span>
          </div>
          <div>
            <AddressToolTip :address="owner" />
            <div class="text-xs text-gray-500 mt-1">Owner</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <ButtonUI
            size="sm"
            variant="secondary"
            :disabled="true"
            data-test="copy-owner-button"
            class="flex items-center gap-1"
          >
            <IconifyIcon icon="heroicons-outline:clipboard" class="w-4 h-4" />
            Configure
          </ButtonUI>
        </div>
      </div>
    </div>

    <template #footer v-if="owners.length > 0">
      <div class="flex justify-between items-center text-sm text-gray-600">
        <span>Total: {{ owners.length }} owners</span>
        <ButtonUI
          variant="secondary"
          size="sm"
          @click="handleOpenSafeApp"
          data-test="open-safe-app-footer"
          class="flex items-center gap-1"
        >
          <IconifyIcon icon="heroicons-outline:external-link" class="w-4 h-4" />
          Manage in Safe App
        </ButtonUI>
      </div>
    </template>
  </CardComponent>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useSafeContract } from '@/composables/safe'
import { useSafeAppUrls } from '@/composables/safe/reads'

import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const chainId = useChainId()

// Safe composables
const { useSafeOwners, useSafeInfo } = useSafeContract()
const { owners, isLoading, error, fetchOwners } = useSafeOwners(
  chainId,
  teamStore.currentTeam?.safeAddress
)
const { safeInfo, fetchSafeInfo } = useSafeInfo(chainId, teamStore.currentTeam?.safeAddress)

// Safe utilities
const { getSafeSettingsUrl, openSafeAppUrl } = useSafeAppUrls()

const handleOpenSafeApp = () => {
  const url = getSafeSettingsUrl(chainId.value, teamStore.currentTeam?.safeAddress as Address)
  openSafeAppUrl(url)
}

const loadSafeData = () => {
  if (!teamStore.currentTeam?.safeAddress) return
  fetchOwners()
  fetchSafeInfo()
}

// Fetch data when Safe address or chain changes
watch(() => teamStore.currentTeam?.safeAddress, loadSafeData)
watch(chainId, loadSafeData)
onMounted(loadSafeData)
</script>
