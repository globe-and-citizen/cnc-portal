<template>
  <template v-if="isOwner">
    <UButton
      color="primary"
      size="sm"
      icon="i-heroicons-arrow-down-tray"
      :disabled="withdrawAll.isPending.value"
      @click="isOpen = true"
    >
      Withdraw
    </UButton>

    <UModal
      :open="isOpen"
      :prevent-close="withdrawAll.isPending.value"
      title="Withdraw all fees"
      :close="{ onClick: () => handleClose() }"
      @update:model-value="isOpen = $event"
    >
      <!-- BODY -->
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            This will sweep every supported token held by the FeeCollector
            to the configured beneficiary in a single transaction. There is
            no amount to enter — the full balance of each token is withdrawn.
          </p>

          <div class="border rounded-lg divide-y dark:divide-gray-700">
            <div
              v-if="sweepableTokens.length === 0"
              class="px-4 py-6 text-center text-sm text-gray-500"
            >
              Nothing to withdraw — every balance is zero.
            </div>

            <div
              v-for="token in sweepableTokens"
              :key="token.address"
              class="flex items-center justify-between px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <UAvatar :alt="token.symbol" size="sm">
                  <template #fallback>
                    <span class="text-sm font-semibold">
                      {{ token.symbol.charAt(0) }}
                    </span>
                  </template>
                </UAvatar>
                <span class="font-medium">
                  {{ token.symbol }}
                </span>
              </div>
              <div class="text-right">
                <div class="font-medium">
                  {{ token.formattedBalance }} {{ token.symbol }}
                </div>
                <div
                  v-if="token.formattedValue"
                  class="text-xs text-gray-500 dark:text-gray-400"
                >
                  {{ token.formattedValue }}
                </div>
              </div>
            </div>
          </div>

          <p v-if="sweepableTokens.length > 0" class="text-right text-sm text-gray-500">
            Total ≈ {{ formattedTotalUsd }}
          </p>

          <UAlert
            v-if="withdrawAll.isError.value"
            color="error"
            variant="subtle"
            title="Failed to withdraw fees"
            :description="errorDescription"
            icon="i-lucide-terminal"
          />
        </div>
      </template>

      <!-- FOOTER -->
      <template #footer>
        <div class="flex justify-end gap-3 pt-2">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="withdrawAll.isPending.value"
            @click="handleClose"
          >
            Cancel
          </UButton>

          <UButton
            color="primary"
            :disabled="sweepableTokens.length === 0"
            :loading="withdrawAll.isPending.value"
            @click="handleConfirm"
          >
            Withdraw all
          </UButton>
        </div>
      </template>
    </UModal>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFeeCollector } from '@/composables/useFeeCollector'
import { isFeeCollectorOwner } from '~/composables/FeeCollector/read'
import { useWithdrawAll } from '~/composables/FeeCollector/writes'
import { parseErrorV2 } from '@/utils'

const toast = useToast()

const isOwner = isFeeCollectorOwner()
const isOpen = ref(false)

const { tokens, formattedTotalUsd } = useFeeCollector()
const withdrawAll = useWithdrawAll()

// Only show tokens that actually have a non-zero balance — those are what
// the on-chain sweep will move. Zero-balance entries are skipped by the
// contract anyway, so there's no value in listing them here.
const sweepableTokens = computed(() =>
  tokens.value.filter(token => token.balance > 0n)
)

const errorDescription = computed(() => {
  const err = withdrawAll.error.value
  return err ? parseErrorV2(err) : ''
})

const handleClose = () => {
  if (withdrawAll.isPending.value) return
  isOpen.value = false
}

const handleConfirm = async () => {
  try {
    await withdrawAll.mutateAsync({ args: [] })
    // V3 auto-invalidates the fee collector's readContract queries on success,
    // so the TokenHoldingsTable balances refresh without manual wiring.
    toast.add({
      title: 'Success',
      description: 'All fees withdrawn successfully',
      color: 'success'
    })
    isOpen.value = false
  } catch {
    // Error surfaced via withdrawAll.error + the UAlert in the modal body.
  }
}

// Reset any previous error state whenever the modal is reopened.
watch(isOpen, (open) => {
  if (open) withdrawAll.reset()
})
</script>
