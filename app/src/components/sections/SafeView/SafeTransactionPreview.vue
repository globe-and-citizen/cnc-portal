<template>
  <div class="bg-base-200 rounded-lg p-4 mb-4" data-test="safe-transaction-preview">
    <h4 class="font-medium text-base mb-3 flex items-center gap-2">
      <IconifyIcon icon="heroicons:information-circle" class="w-5 h-5 text-info" />
      Transaction Preview
    </h4>

    <div class="space-y-3">
      <!-- Method Call -->
      <div v-if="transaction.dataDecoded" class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-600">Method:</span>
          <span class="badge badge-primary badge-outline">
            {{ transaction.dataDecoded.method }}
          </span>
        </div>

        <!-- Parameters -->
        <div
          v-if="transaction.dataDecoded.parameters?.length"
          class="pl-4 border-l-2 border-primary/20"
        >
          <div class="text-sm font-medium text-gray-600 mb-2">Parameters:</div>
          <div class="space-y-1">
            <div
              v-for="(param, index) in transaction.dataDecoded.parameters"
              :key="index"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-gray-500">{{ param.name }} ({{ param.type }}):</span>
              <span class="font-mono text-xs bg-base-300 px-2 py-1 rounded">
                {{ formatParameterValue(param) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Basic Transaction Info -->
      <div class="divider my-2"></div>

      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="flex flex-col">
          <span class="text-gray-500">To:</span>
          <AddressToolTip :address="transaction.to" class="text-xs" />
        </div>

        <div class="flex flex-col">
          <span class="text-gray-500">Value:</span>
          <span class="font-mono"
            >{{ formatValue(transaction.value) }} {{ NETWORK.currencySymbol }}</span
          >
        </div>

        <div class="flex flex-col">
          <span class="text-gray-500">Operation:</span>
          <span class="badge badge-ghost badge-sm">
            {{ transaction.operation === 0 ? 'Call' : 'DelegateCall' }}
          </span>
        </div>

        <div class="flex flex-col">
          <span class="text-gray-500">Nonce:</span>
          <span class="font-mono">{{ transaction.nonce }}</span>
        </div>
      </div>

      <!-- Raw Data (Collapsible) -->
      <div class="collapse collapse-arrow bg-base-100">
        <input type="checkbox" data-test="raw-data-toggle" />
        <div class="collapse-title text-sm font-medium">View Raw Transaction Data</div>
        <div class="collapse-content">
          <div class="bg-base-300 rounded p-3 font-mono text-xs overflow-x-auto">
            {{ transaction.data }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatEther } from 'viem'
import { Icon as IconifyIcon } from '@iconify/vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import type { SafeTransaction } from '@/types/safe'
import { NETWORK } from '@/constant'

interface Props {
  transaction: SafeTransaction
}

const props = defineProps<Props>()

const formatValue = (value: string): string => {
  try {
    const etherValue = formatEther(BigInt(value))
    return parseFloat(etherValue).toFixed(4)
  } catch {
    return '0'
  }
}

const formatParameterValue = (param: { name: string; type: string; value: string }) => {
  // Format based on parameter type
  switch (param.type) {
    case 'uint256':
    case 'uint':
      return param.value
    case 'address':
      return `${param.value.slice(0, 6)}...${param.value.slice(-4)}`
    case 'bool':
      return param.value === 'true' ? '✓' : '✗'
    case 'bytes':
    case 'bytes32':
      return `${param.value.slice(0, 10)}...`
    default:
      return param.value.length > 20 ? `${param.value.slice(0, 20)}...` : param.value
  }
}
</script>
