<template>
  <section class="space-y-4" aria-labelledby="contract-data-title">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 id="contract-data-title" class="text-highlighted font-semibold">Contract data</h3>
        <p class="text-muted mt-1 text-sm">Current values returned by parameterless reads.</p>
      </div>
      <UButton
        v-if="data || isError"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-refresh-cw"
        aria-label="Refresh contract data"
        data-test="refresh-contract-data"
        :loading="isFetching"
        @click="refreshData"
      />
    </div>

    <div v-if="isPending" class="space-y-3" data-test="contract-data-loading">
      <div v-for="index in 4" :key="index" class="space-y-2">
        <USkeleton class="h-3 w-32" />
        <USkeleton class="h-5 w-full" />
      </div>
    </div>

    <UAlert
      v-else-if="isError"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Contract data could not be loaded"
      description="The contract or network rejected every available read."
      data-test="contract-data-error"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="xs"
          label="Try again"
          data-test="retry-contract-data"
          @click="refreshData"
        />
      </template>
    </UAlert>

    <UEmpty
      v-else-if="!data?.fields.length"
      variant="naked"
      size="sm"
      icon="i-lucide-database-zap"
      title="No readable data"
      description="This contract does not expose parameterless read functions."
      data-test="contract-data-empty"
    />

    <template v-else>
      <dl class="divide-default divide-y text-sm" data-test="contract-data-values">
        <div v-for="field in data.fields" :key="field.functionName" class="py-3">
          <dt class="flex flex-wrap items-baseline justify-between gap-2">
            <span class="text-muted">{{ field.label }}</span>
            <code class="text-dimmed text-xs">{{ field.functionName }}()</code>
          </dt>
          <dd class="text-highlighted mt-1.5 min-w-0 font-medium">
            <AddressToolTip
              v-if="field.isAddress"
              :address="field.value"
              class="font-mono text-xs break-all"
            />
            <code v-else class="block break-all whitespace-pre-wrap">{{ field.value }}</code>
          </dd>
        </div>
      </dl>

      <UAlert
        v-if="data.failedCount"
        color="warning"
        variant="subtle"
        icon="i-lucide-info"
        :title="`${data.failedCount} ${data.failedCount === 1 ? 'value is' : 'values are'} unavailable`"
        description="The remaining contract data was loaded successfully."
        data-test="contract-data-partial"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import type { Abi, Address } from 'viem'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import { useContractReadData } from '@/composables/contracts/useContractReadData'

const props = defineProps<{
  address: Address
  abi: Abi
  contractType: string
  enabled: boolean
}>()

const { data, isPending, isFetching, isError, refetch } = useContractReadData({
  address: toRef(props, 'address'),
  abi: toRef(props, 'abi'),
  contractType: toRef(props, 'contractType'),
  enabled: toRef(props, 'enabled')
})

function refreshData() {
  void refetch()
}
</script>
