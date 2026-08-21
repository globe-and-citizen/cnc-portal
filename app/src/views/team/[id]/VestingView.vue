<template>
  <main class="flex flex-col gap-8 pb-8" data-test="vesting-view">
    <header
      class="border-primary-200 from-primary-50 dark:border-primary-900 dark:from-primary-950/40 relative overflow-hidden rounded-2xl border bg-gradient-to-br via-white to-white p-5 sm:p-7 dark:via-gray-950 dark:to-gray-950"
    >
      <div class="bg-primary-200/40 absolute -top-16 -right-12 h-48 w-48 rounded-full blur-3xl" />
      <div class="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-2xl">
          <div class="flex items-center gap-3">
            <div class="bg-primary flex size-11 items-center justify-center rounded-xl text-white">
              <UIcon name="i-lucide-timer-reset" class="size-6" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-semibold text-gray-950 dark:text-white">Vesting</h1>
                <UBadge color="success" variant="soft">V2</UBadge>
              </div>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Turn long-term grants into transparent, claimable shares.
              </p>
            </div>
          </div>
          <p class="mt-5 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            Follow every grant from its start and cliff to release or cancellation. Shares are
            minted only when they become claimable.
          </p>
        </div>

        <VestingActions @reload="refetch" />
      </div>
    </header>

    <VestingStats :totals="totals" :token-symbol="tokenSymbol" :is-loading="isLoading" />

    <VestingFlow
      :schedules="schedules"
      :token-symbol="tokenSymbol"
      :is-loading="isLoading"
      :error="error"
      @reload="refetch"
      @retry="refetch"
    />
  </main>
</template>

<script setup lang="ts">
import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import VestingStats from '@/components/sections/VestingView/VestingStats.vue'
import { useVestingSchedules } from '@/composables/vesting/useVestingSchedules'

const { schedules, totals, tokenSymbol, isLoading, error, refetch } = useVestingSchedules()
</script>
