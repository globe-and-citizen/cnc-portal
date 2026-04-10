<template>
  <UModal
    :open="isOpen"
    :prevent-close="isLoadingWithdraw || isConfirmingWithdraw"
    title="Withdraw all fees"
    :close="{ onClick: () => handleClose() }"
    @update:model-value="$emit('update:isOpen', $event)"
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
      </div>
    </template>

    <!-- FOOTER -->
    <template #footer>
      <div class="flex justify-end gap-3 pt-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="isLoadingWithdraw || isConfirmingWithdraw"
          @click="handleClose"
        >
          Cancel
        </UButton>

        <UButton
          color="primary"
          :disabled="sweepableTokens.length === 0"
          :loading="isLoadingWithdraw || isConfirmingWithdraw"
          @click="handleConfirm"
        >
          {{ isConfirmingWithdraw ? 'Confirming...' : 'Withdraw all' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFeeCollector } from '@/composables/useFeeCollector'

interface Props {
  isOpen: boolean
  isLoadingWithdraw?: boolean
  isConfirmingWithdraw?: boolean
}

withDefaults(defineProps<Props>(), {
  isLoadingWithdraw: false,
  isConfirmingWithdraw: false
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'close': []
  'withdraw': []
}>()

const { tokens, formattedTotalUsd } = useFeeCollector()

// Only show tokens that actually have a non-zero balance — those are what
// the on-chain sweep will move. Zero-balance entries are skipped by the
// contract anyway, so there's no value in listing them here.
const sweepableTokens = computed(() =>
  tokens.value.filter(token => token.balance > 0n)
)

const handleClose = () => {
  emit('close')
}

const handleConfirm = () => {
  emit('withdraw')
}
</script>
