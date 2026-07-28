<template>
  <div class="space-y-8">
    <UAlert
      icon="i-heroicons-clock"
      color="warning"
      variant="soft"
      :title="`Legacy version ${version}`"
      description="This is a historical FeeCollector deployment. Management actions below act directly on this older contract — proceed with care."
    />

    <!-- Owner-gated management actions (empty for non-owners). -->
    <slot name="actions" />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Native balance -->
      <UCard>
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Native Balance
            </p>
            <p class="text-2xl font-bold mt-1">
              <span v-if="isLoading">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
              </span>
              <span v-else-if="balanceError" class="text-red-600 dark:text-red-400 text-base">
                Failed to load balance
              </span>
              <span v-else>{{ formattedNativeBalance }}</span>
            </p>
          </div>
          <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900">
            <UIcon name="i-heroicons-wallet" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </UCard>

      <!-- Owner -->
      <UCard>
        <div class="flex items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Owner
            </p>
            <div class="mt-2">
              <span v-if="isLoading">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
              </span>
              <span v-else-if="ownerError" class="text-red-600 dark:text-red-400 text-sm">
                Failed to load owner
              </span>
              <UserIdentity v-else :address="owner" />
            </div>
          </div>
          <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-900">
            <UIcon name="i-heroicons-key" class="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Fee configs -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">
          Fee Configurations
        </h3>
      </template>
      <div v-if="isLoading" class="py-6 text-center">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
      </div>
      <p v-else-if="configsError" class="text-red-600 dark:text-red-400 text-sm py-4">
        Failed to load fee configurations
      </p>
      <p v-else-if="feeConfigs.length === 0" class="text-gray-500 dark:text-gray-400 text-sm py-4">
        No fee configurations
      </p>
      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <li
          v-for="config in feeConfigs"
          :key="config.contractType"
          class="flex items-center justify-between py-3"
        >
          <span class="font-medium">{{ config.contractType }}</span>
          <span class="text-gray-600 dark:text-gray-400">{{ formatBps(config.feeBps) }}</span>
        </li>
      </ul>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatUnits, type Address } from 'viem'
import type { FeeCollectorVersion } from '~/artifacts/feeCollectorRegistry'
import UserIdentity from '@/components/UserIdentity.vue'

interface LegacyFeeConfig {
  contractType: string
  feeBps: bigint | number
}

const props = defineProps<{
  version: FeeCollectorVersion
  nativeBalance: unknown
  owner: Address | undefined
  feeConfigs: readonly LegacyFeeConfig[]
  isLoading: boolean
  balanceError: boolean
  ownerError: boolean
  configsError: boolean
  nativeSymbol: string
}>()

const formattedNativeBalance = computed(() => {
  const raw = typeof props.nativeBalance === 'bigint' ? props.nativeBalance : 0n
  return `${formatUnits(raw, 18)} ${props.nativeSymbol}`
})

const formatBps = (bps: bigint | number) => `${Number(bps) / 100}%`
</script>
