<!-- filepath: app/src/components/sections/SafeView/SafeBalanceSection.vue -->
<template>
  <CardComponent title="Balance">
    <div class="flex justify-between items-start">
      <div class="flex flex-col gap-2">
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold">
            <span class="inline-block min-w-16 h-10">
              <span
                v-if="isLoading"
                class="loading loading-spinner loading-lg"
                data-test="safe-balance-loading"
              ></span>
              <span v-else>${{ displayUsdBalance }}</span>
            </span>
          </span>
          <span class="text-gray-600">USD</span>
        </div>
        <div class="text-sm text-gray-500 mt-1">
          ≈ {{ displayLocalBalance }} {{ currency.code }}
        </div>
        <div class="text-sm text-gray-600 mt-2 flex flex-col gap-1">
          <div>
            <span class="font-medium">{{ safeInfo?.threshold ?? '-' }}</span> of
            <span class="font-medium">{{ safeInfo?.owners.length || 0 }}</span> signatures required
          </div>
          <div class="text-xs text-gray-500">Safe Balance</div>
        </div>
      </div>

      <div class="flex flex-col items-end gap-4">
        <ButtonUI
          v-if="teamStore.currentTeam?.safeAddress"
          variant="primary"
          class="flex items-center gap-2"
          @click="openInSafeApp"
          data-test="open-safe-app-button"
        >
          <IconifyIcon icon="heroicons-outline:external-link" class="w-5 h-5" />
          Open in Safe App
        </ButtonUI>

        <div class="flex items-center gap-2" v-if="teamStore.currentTeam?.safeAddress">
          <div class="text-sm text-gray-600">Safe Address:</div>
          <AddressToolTip :address="teamStore.currentTeam?.safeAddress" />
        </div>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import { useStorage } from '@vueuse/core'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { getSafeHomeUrl, openSafeAppUrl } from '@/composables/safe'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'
import { useSafeInfoQuery } from '@/queries/safe.queries'

const chainId = useChainId()
const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

const teamStore = useTeamStore()

const {
  data: safeInfo,
  isLoading,
  error
} = useSafeInfoQuery(
  chainId,
  computed(() => teamStore.currentTeamMeta?.data?.safeAddress)
)

const displayUsdBalance = computed(
  () => safeInfo.value?.totals?.['USD']?.formated ?? safeInfo.value?.balance ?? 0
)

// The object return by safeInfo do not contain any attribute totals, so i don't know how this code worked
const displayLocalBalance = computed(() => {
  const local = safeInfo.value?.totals?.[currency.value.code]?.formated
  if (local) return local
  const usd = safeInfo.value?.totals?.['USD']?.formated
  if (usd) return usd
  return safeInfo.value?.balance ?? 0
})
// const isBalanceLoading = computed(() => isSafeLoading.value)

const openInSafeApp = () => {
  const safeAppUrl = getSafeHomeUrl(chainId.value, teamStore.currentTeam?.safeAddress as Address)
  openSafeAppUrl(safeAppUrl)
}

// Watch for errors
watch(error, (newError) => {
  if (newError) {
    console.error('Safe error:', newError)
  }
})
</script>
