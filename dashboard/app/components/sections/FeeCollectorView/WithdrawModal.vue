<template>
  <UModal
    :open="isOpen"
    :prevent-close="isLoadingWithdraw || isConfirmingWithdraw"
    title="Withdraw from Fee Collector Contract"
    :close="{ onClick: () => handleClose() }"
    @update:model-value="$emit('update:isOpen', $event)"
  >
    <!-- HEADER -->

    <!-- BODY -->
    <template #body>
      <div class="space-y-6">
        <!-- Amount + Token box -->
        <div class="border rounded-lg px-4 py-3 space-y-1">
          <div class="flex items-center justify-between text-sm text-gray-500">
            <span>Amount</span>
            <span v-if="selectedToken">
              Balance: {{ selectedToken.formattedBalance }} {{ selectedToken.symbol }}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <UInput
              v-model="withdrawAmount"
              placeholder="0"
              inputmode="decimal"
              size="xl"
              class="flex-1"
              :disabled="!selectedToken || isLoadingWithdraw || isConfirmingWithdraw"
            />

            <!-- TOKEN DROPDOWN -->
            <UDropdownMenu :items="dropdownItems">
              <UButton
                color="neutral"
                variant="solid"
                class="min-w-[70px] flex justify-between"
                :disabled="isLoadingWithdraw || isConfirmingWithdraw"
              >
                {{ selectedToken ? selectedToken.symbol : 'Select' }}
                <UIcon name="i-heroicons-chevron-down" />
              </UButton>
            </UDropdownMenu>
          </div>

          <!-- % BUTTONS -->
          <div class="flex justify-end gap-4 text-xs text-gray-600 pt-1">
            <button type="button" :disabled="!selectedToken" @click="setPercentAmount(25)">
              25%
            </button>
            <button type="button" :disabled="!selectedToken" @click="setPercentAmount(50)">
              50%
            </button>
            <button type="button" :disabled="!selectedToken" @click="setPercentAmount(75)">
              75%
            </button>
            <button type="button" :disabled="!selectedToken" @click="setMaxAmount">
              Max
            </button>
          </div>
        </div>

        <!-- Fiat estimate -->
        <p class="text-gray-500 text-sm">
          ≈ {{ estimatedUSD }}
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
          :disabled="!isValid"
          :loading="isLoadingWithdraw || isConfirmingWithdraw"
          @click="handleSubmit"
        >
          {{ isConfirmingWithdraw ? 'Confirming...' : 'Withdraw' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TokenDisplay } from '@/types/token'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useFeeCollector } from '@/composables/useFeeCollector'
import { useTokenPriceStore } from '@/stores/useTokenPriceStore'

interface Props {
  isOpen: boolean
  isLoadingWithdraw?: boolean
  isConfirmingWithdraw?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoadingWithdraw: false,
  isConfirmingWithdraw: false
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'close': []
  'withdraw': [token: TokenDisplay, amount: string]
}>()

// Get data from composables
const { tokens } = useFeeCollector()
const tokenPriceStore = useTokenPriceStore()

// Local state
const selectedToken = ref<TokenDisplay | null>(null)
const withdrawAmount = ref('')

// Dropdown items
const dropdownItems = computed<DropdownMenuItem[]>(() =>
  tokens.value.map(token => ({
    label: `${token.symbol} — ${token.formattedBalance}`,
    onSelect: () => {
      selectedToken.value = token
      withdrawAmount.value = ''
    }
  }))
)

// Calculate estimated USD using store
const estimatedUSD = computed(() => {
  if (!selectedToken.value || !withdrawAmount.value) return '$0.00'

  const amount = parseFloat(withdrawAmount.value)
  if (isNaN(amount) || amount === 0) return '$0.00'

  const price = tokenPriceStore.getTokenPrice(selectedToken.value)
  const usdValue = price * amount

  if (usdValue < 0.0001) return '< $0.0001'
  if (usdValue < 0.01) return `$${usdValue.toFixed(4)}`
  return `$${usdValue.toFixed(2)}`
})

// Set max amount
const setMaxAmount = () => {
  if (selectedToken.value && selectedToken.value.formattedBalance) {
    withdrawAmount.value = selectedToken.value.formattedBalance
  }
}

// Set percentage amount
const setPercentAmount = (percent: number) => {
  if (selectedToken.value && selectedToken.value.formattedBalance) {
    const maxAmount = parseFloat(selectedToken.value.formattedBalance)
    const percentAmount = (maxAmount * percent) / 100
    withdrawAmount.value = percentAmount.toFixed(selectedToken.value.decimals)
  }
}

// Validation
const isValid = computed(() => {
  if (!selectedToken.value || !withdrawAmount.value || !selectedToken.value.formattedBalance) return false
  const amount = parseFloat(withdrawAmount.value)
  const maxAmount = parseFloat(selectedToken.value.formattedBalance)
  return !isNaN(amount) && amount > 0 && amount <= maxAmount
})

// Handlers
const handleClose = () => {
  selectedToken.value = null
  withdrawAmount.value = ''
  emit('close')
}

const handleSubmit = () => {
  if (!selectedToken.value || !withdrawAmount.value || !isValid.value) return
  emit('withdraw', selectedToken.value, withdrawAmount.value)
}

// Reset when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    selectedToken.value = null
    withdrawAmount.value = ''
  }
})
</script>
