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

    <UAccordion
      v-if="generations.length"
      v-model="openGenerations"
      :items="historyItems"
      type="multiple"
      value-key="accordionValue"
      label-key="version"
      :ui="{
        root: 'space-y-3',
        item: 'rounded-lg border-0 bg-default ring ring-default',
        trigger: 'px-4 py-4 sm:px-6',
        body: 'px-4 pb-4 sm:px-6 sm:pb-6'
      }"
    >
      <template #default="{ item: generation }">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-highlighted font-medium">Officer generation</span>
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ generation.version || 'Unknown version' }}
            </UBadge>
            <UBadge color="neutral" variant="soft" size="sm">Archived</UBadge>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-sm font-normal">
            <span class="text-muted">Officer</span>
            <AddressToolTip :address="generation.officerAddress" :slice="true" class="text-xs" />
            <span class="text-muted">· {{ generation.contracts.length }} contracts</span>
          </div>
        </div>
      </template>

      <template #body="{ item: generation }">
        <div class="border-default mb-4 flex justify-end border-t pt-4">
          <LegacyGenerationWithdrawAction
            :officer-address="generation.officerAddress"
            :contracts="generation.contracts"
          />
        </div>
        <MainContractTable
          :contracts="generation.contracts"
          :version="generation.version"
          :show-actions="false"
        />
      </template>
    </UAccordion>

    <UEmpty
      v-if="!generations.length"
      icon="i-lucide-history"
      title="No archived deployments"
      description="Previous Officer generations will appear here after a redeployment."
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import type { ContractGeneration } from '@/types/deployments'
import LegacyGenerationWithdrawAction from './LegacyGenerationWithdrawAction.vue'
import MainContractTable from './MainContractTable.vue'

const props = defineProps<{
  generations: ContractGeneration[]
}>()

const openGenerations = ref<string[]>([])
const historyItems = computed(() =>
  props.generations.map((generation) => ({
    ...generation,
    accordionValue: String(generation.key)
  }))
)

watch(
  () => props.generations,
  (generations) => {
    const generationKeys = new Set(generations.map(({ key }) => String(key)))
    openGenerations.value = openGenerations.value.filter((key) => generationKeys.has(key))

    if (!openGenerations.value.length && generations[0]) {
      openGenerations.value = [String(generations[0].key)]
    }
  },
  { immediate: true }
)
</script>
