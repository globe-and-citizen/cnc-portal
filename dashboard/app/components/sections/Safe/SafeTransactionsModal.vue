<template>
  <UModal
    :open="open"
    title="Safe Transactions"
    class="max-w-2xl"
    :close="{ onClick: handleClose }"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #body>
      <div class="mb-4 flex gap-2">
        <UButton :color="tab==='pending' ? 'primary' : 'neutral'" @click="tab='pending'">
          Pending
        </UButton>
        <UButton :color="tab==='executed' ? 'primary' : 'neutral'" @click="tab='executed'">
          Executed
        </UButton>
      </div>
      <div v-if="loading" class="text-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin" />
      </div>
      <div v-else>
        <table class="w-full text-xs">
          <thead>
            <tr>
              <th class="text-left px-2 py-2">Nonce</th>
              <th class="text-left px-2 py-2">To</th>
              <th class="text-left px-2 py-2">Value</th>
              <th class="text-left px-2 py-2">Status</th>
              <th class="text-left px-2 py-2">Tx Hash</th>
              <th class="text-left px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in txs" :key="tx.safeTxHash">
              <td class="px-2 py-2">{{ tx.nonce }}</td>
              <td class="px-2 py-2 font-mono truncate">{{ tx.to }}</td>
              <td class="px-2 py-2">{{ tx.value }}</td>
              <td class="px-2 py-2">
                <UBadge :color="txMeta[tx.safeTxHash]?.statusColor" variant="soft">
                  {{ txMeta[tx.safeTxHash]?.status }}
                </UBadge>
                <div v-if="tx.confirmationsRequired">
                  <span class="text-xs text-gray-500">
                    {{ tx.confirmations?.length || 0 }} / {{ tx.confirmationsRequired }} approvals
                  </span>
                </div>
              </td>
              <td class="px-2 py-2 font-mono truncate">
                <a :href="tx.isExecuted ? txUrl(tx) : '#'" target="_blank" class="underline">
                    {{ tx.isExecuted ? tx.transactionHash?.slice(0, 6) : '' }}
                </a>
              </td>
              <td class="px-2 py-2">
                <div v-if="!tx.isExecuted" class="flex flex-col gap-2">
                  <UButton
                    v-if="txMeta[tx.safeTxHash]?.canApprove"
                    :loading="approvingTx === tx.safeTxHash"
                    size="xs"
                    variant="outline"
                    @click="approveTx(tx.safeTxHash)"
                  >
                    Approve
                  </UButton>
                  <UButton
                    v-if="txMeta[tx.safeTxHash]?.canExecute"
                    :loading="executingTx === tx.safeTxHash"
                    size="xs"
                    color="primary"
                    @click="executeTx(tx.safeTxHash)"
                  >
                    Execute
                  </UButton>
                </div>
                <span v-else class="text-xs text-green-600">Executed</span>
              </td>
            </tr>
            <tr v-if="txs.length === 0">
              <td colspan="6" class="text-center py-8 text-gray-500">
                No transactions found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
      />
      <UAlert
        v-if="success"
        color="success"
        variant="soft"
        :title="`Execution successful`"
      >
        <template #description>
          <p class="mt-2 text-xs break-all">Tx Hash: {{ success }}</p>
        </template>
      </UAlert>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useSafeTransactions, txUrl } from '@/composables/Safe/read'
import { useSafe } from '@/composables/useSafe'
import type { SafeTx } from '@/types/safe'

const props = defineProps<{
  modelValue: boolean
  safeAddress: string
  chain: string
}>()

const emit = defineEmits(['update:modelValue'])

const open = ref(props.modelValue)
watch(() => props.modelValue, v => (open.value = v))
watch(open, v => emit('update:modelValue', v))

const tab = ref<'pending' | 'executed'>('pending')

const error = ref<string | null>(null)
const success = ref<string | null>(null)
const approvingTx = ref<string | null>(null)
const executingTx = ref<string | null>(null)
const connectedAddress = ref<string | null>(null)
const justExecuted = ref<Set<string>>(new Set())

const { getDeployerInfo, approveTransaction, executeTransaction } = useSafe()
const queryClient = useQueryClient()

onMounted(async () => {
  try {
    const info = await getDeployerInfo()
    connectedAddress.value = info.address
  } catch {
    connectedAddress.value = null
  }
})

watch(open, (v) => {
  emit('update:modelValue', v)
  if (v) {
    console.log('open safe tx modal')
    // Reset alerts when modal opens
    error.value = null
    success.value = null
  }
})

const { txs, loading, refetch: fetchTransactions } = useSafeTransactions({
  safeAddress: computed(() => props.safeAddress),
  executed: computed(() => tab.value === 'executed'),
  enabled: computed(() => open.value && !!props.safeAddress)
})

const txMeta = computed(() => {
  const addr = connectedAddress.value?.toLowerCase() || null
  const executedSet = justExecuted.value
  return txs.value.reduce<Record<string, {
    confirmations: number
    required: number
    alreadyConfirmed: boolean
    locallyExecuted: boolean
    canApprove: boolean
    canExecute: boolean
    status: string
    statusColor: 'success' | 'warning' | 'neutral'
  }>>((acc, tx: SafeTx) => {
    const confirmations = tx.confirmations?.length || 0
    const required = tx.confirmationsRequired || 0
    const alreadyConfirmed = !!addr && tx.confirmations?.some(c => c.owner.toLowerCase() === addr) || false
    const locallyExecuted = tx.isExecuted || executedSet.has(tx.safeTxHash)
    const canApprove = !!addr && !locallyExecuted && !alreadyConfirmed && confirmations < required
    const canExecute = !locallyExecuted && confirmations >= required
    const status = locallyExecuted ? 'Executed' : canExecute ? 'Ready to Execute' : 'Pending'
    const statusColor = locallyExecuted ? 'success' : canExecute ? 'warning' : 'neutral'
    acc[tx.safeTxHash] = { confirmations, required, alreadyConfirmed, locallyExecuted, canApprove, canExecute, status, statusColor }
    return acc
  }, {})
})

function handleClose() {
  emit('update:modelValue', false)
}

async function approveTx(safeTxHash: string) {
  approvingTx.value = safeTxHash
  error.value = null
  success.value = null
  try {
    await approveTransaction(props.safeAddress, safeTxHash)
    success.value = 'Approved'
    queryClient.invalidateQueries({
      queryKey: ['safeTxs', props.safeAddress]
    })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to approve'
  } finally {
    approvingTx.value = null
  }
}

async function executeTx(safeTxHash: string) {
  executingTx.value = safeTxHash
  error.value = null
  success.value = null
  try {
    await executeTransaction(props.safeAddress, safeTxHash)
    success.value = `Executed ${safeTxHash}`
    justExecuted.value.add(safeTxHash)
    queryClient.invalidateQueries({
      queryKey: ['safeTxs', props.safeAddress]
    })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to execute'
  } finally {
    executingTx.value = null
  }
}
</script>
