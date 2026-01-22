<template>
  <CardComponent>
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <div class="text-red-600 text-sm">{{ error }}</div>
    </div>

    <div v-else-if="safeInfo?.owners.length === 0" class="text-center py-8">
      <div class="text-gray-500">No owners found</div>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(owner, index) in safeInfo?.owners"
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

    <template #footer v-if="safeInfo?.owners?.length ?? 0 > 0">
      <div class="flex justify-between items-center text-sm text-gray-600">
        <span>Total: {{ safeInfo?.owners.length }} owners</span>
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
import { computed } from 'vue'
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { getSafeSettingsUrl, openSafeAppUrl } from '@/composables/safe'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'
import { useSafeInfoQuery } from '@/queries/safe.queries'

const teamStore = useTeamStore()
const chainId = useChainId()

const {
  data: safeInfo,
  isLoading,
  error
} = useSafeInfoQuery(computed(() => teamStore.currentTeamMeta?.data?.safeAddress))

const handleOpenSafeApp = () => {
  const url = getSafeSettingsUrl(chainId.value, teamStore.currentTeam?.safeAddress as Address)
  openSafeAppUrl(url)
}
</script>
