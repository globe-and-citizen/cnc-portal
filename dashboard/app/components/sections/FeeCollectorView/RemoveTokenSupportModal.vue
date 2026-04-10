<template>
  <UModal
    :open="modelValue"
    :prevent-close="removeTokenSupport.isPending.value"
    title="Remove token support"
    :close="{ onClick: () => handleClose() }"
    class="max-w-lg mx-auto rounded-xl shadow-lg bg-white dark:bg-gray-900 p-0"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          The FeeCollector will no longer accept this token as a fee and
          <code>withdraw()</code> will stop including it in sweeps. Fee-paying
          contracts that route this token through here will revert on future
          attempts.
        </p>

        <div class="border rounded-lg px-4 py-3 flex items-center justify-between dark:border-gray-700">
          <div class="flex items-center gap-3 min-w-0">
            <UAvatar :alt="token?.symbol || 'Token'" size="sm">
              <template #fallback>
                <span class="text-sm font-semibold">
                  {{ (token?.symbol || '?').charAt(0) }}
                </span>
              </template>
            </UAvatar>
            <div class="min-w-0">
              <div class="font-medium text-sm">
                {{ token?.symbol || 'Token' }}
              </div>
              <div class="font-mono text-xs text-gray-500 truncate">
                {{ shortAddress(token?.address) }}
              </div>
            </div>
          </div>
          <div class="text-right text-sm">
            <div class="font-medium">
              {{ token?.formattedBalance || '0' }} {{ token?.symbol }}
            </div>
            <div
              v-if="token?.formattedValue"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              {{ token.formattedValue }}
            </div>
          </div>
        </div>

        <UAlert
          v-if="hasBalance"
          color="warning"
          variant="subtle"
          title="This token has a non-zero balance"
          description="Removing support will strand the current balance — the contract can no longer sweep it through withdraw(). Withdraw fees first if you want the beneficiary to receive these funds."
          icon="i-heroicons-exclamation-triangle"
        />

        <UAlert
          v-if="removeTokenSupport.isError.value"
          color="error"
          variant="subtle"
          title="Failed to remove token support"
          :description="errorDescription"
          icon="i-lucide-terminal"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 pt-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="removeTokenSupport.isPending.value"
          @click="handleClose"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          :disabled="!token || removeTokenSupport.isPending.value"
          :loading="removeTokenSupport.isPending.value"
          @click="handleConfirm"
        >
          Remove support
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Address } from 'viem'
import type { TokenDisplay } from '@/types/token'
import { useRemoveTokenSupport } from '~/composables/FeeCollector/writes'
import { parseErrorV2 } from '@/utils'

const props = defineProps<{
  modelValue: boolean
  token: TokenDisplay | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
}>()

const removeTokenSupport = useRemoveTokenSupport()

const hasBalance = computed(() => (props.token?.balance ?? 0n) > 0n)

const errorDescription = computed(() => {
  const err = removeTokenSupport.error.value
  return err ? parseErrorV2(err) : ''
})

function shortAddress(addr: string | undefined): string {
  if (!addr) return ''
  return addr.length >= 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
}

const handleClose = () => {
  if (removeTokenSupport.isPending.value) return
  emit('update:modelValue', false)
  emit('close')
}

const handleConfirm = async () => {
  if (!props.token || removeTokenSupport.isPending.value) return
  await removeTokenSupport.mutateAsync({
    args: [props.token.address as Address]
  })
  // V3 auto-invalidates the fee collector's reads, so the TokenHoldings
  // table refreshes and drops this row automatically.
  emit('update:modelValue', false)
  emit('close')
}

// Clear any stale mutation error whenever the modal reopens for a new token.
watch(
  () => props.modelValue,
  (open) => {
    if (open) removeTokenSupport.reset()
  }
)
</script>
