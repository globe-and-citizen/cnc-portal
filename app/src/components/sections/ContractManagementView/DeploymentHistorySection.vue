<template>
  <section class="space-y-4" aria-labelledby="deployment-history-title">
    <div class="flex flex-col gap-1">
      <h2 id="deployment-history-title" class="text-highlighted text-lg font-semibold">
        Deployment history
      </h2>
      <p class="text-muted text-sm">
        Review previous Officer generations and recover funds left in archived contracts.
      </p>
    </div>

    <UAlert
      v-if="generations.length"
      color="warning"
      variant="subtle"
      icon="i-lucide-shield-alert"
      title="Archived contracts are read-only"
      description="Use Withdraw Funds to review eligible balances and move them through the legacy Officer."
    />

    <UCard v-for="generation in generations" :key="generation.key">
      <template #header>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-highlighted font-medium">Officer generation</span>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ generation.version || 'Unknown version' }}
              </UBadge>
              <UBadge color="neutral" variant="soft" size="sm">Archived</UBadge>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">Officer</span>
              <AddressToolTip :address="generation.officerAddress" :slice="true" class="text-xs" />
              <span class="text-muted">· {{ generation.contracts.length }} contracts</span>
            </div>
          </div>

          <LegacyGenerationWithdrawAction
            :officer-address="generation.officerAddress"
            :contracts="generation.contracts"
          />
        </div>
      </template>

      <MainContractTable
        :contracts="generation.contracts"
        :version="generation.version"
        :show-actions="false"
      />
    </UCard>

    <UEmpty
      v-if="!generations.length"
      icon="i-lucide-history"
      title="No archived deployments"
      description="Previous Officer generations will appear here after a redeployment."
    />
  </section>
</template>

<script setup lang="ts">
import AddressToolTip from '@/components/AddressToolTip.vue'
import type { ContractGeneration } from '@/composables/contracts/useContractManagementGenerations'
import LegacyGenerationWithdrawAction from './LegacyGenerationWithdrawAction.vue'
import MainContractTable from './MainContractTable.vue'

defineProps<{
  generations: ContractGeneration[]
}>()
</script>
