<template>
  <UModal
    :open="isOpen"
    :prevent-close="isLoadingWithdraw || isConfirmingWithdraw"
    @update:model-value="$emit('update:isOpen', $event)"
  >
    <!-- HEADER -->
    <template #header>
      <div class="flex items-center justify-between pb-2">
        <p class="text-xl font-semibold">
          Withdraw to Fee Collector Contract
        </p>

        <UButton
          icon="i-heroicons-x-mark"
          variant="ghost"
          color="neutral"
          size="sm"
          :disabled="isLoadingWithdraw || isConfirmingWithdraw"
          @click="$emit('close')"
        />
      </div>
    </template>

    <!-- BODY -->
    <template #body>
      <div class="space-y-6">
        <!-- Amount + Token box -->
        <div class="border rounded-lg px-4 py-3 space-y-1">
          <div class="flex items-center justify-between text-sm text-gray-500">
            <span>Amount</span>
            <span v-if="activeToken">
              Balance: {{ activeToken.formattedBalance }} {{ activeToken.symbol }}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <UInput
              :model-value="amount"
              placeholder="0"
              inputmode="decimal"
              size="xl"
              class="flex-1"
              @update:model-value="$emit('update:amount', $event)"
            />

            <!-- TOKEN DROPDOWN -->
            <UDropdownMenu :items="dropdownItems">
              <UButton 
                color="neutral"
                variant="solid"
                class="min-w-[70px] flex justify-between"
              >
                {{ activeToken ? activeToken.symbol : 'Select' }}
                <UIcon name="i-heroicons-chevron-down" />
              </UButton>
            </UDropdownMenu>
          </div>

          <!-- % BUTTONS -->
          <div class="flex justify-end gap-4 text-xs text-gray-600 pt-1">
            <button type="button" @click="$emit('setPercent', 25)">25%</button>
            <button type="button" @click="$emit('setPercent', 50)">50%</button>
            <button type="button" @click="$emit('setPercent', 75)">75%</button>
            <button type="button" @click="$emit('setMax')">Max</button>
          </div>
        </div>

        <!-- Fiat estimate -->
        <p class="text-gray-500 text-sm">
          ≈ {{ estimateFiat }}
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
          @click="$emit('close')"
        >
          Cancel
        </UButton>

        <UButton
          color="primary"
          :disabled="!isValid"
          :loading="isLoadingWithdraw || isConfirmingWithdraw"
          @click="$emit('submit')"
        >
          {{ isConfirmingWithdraw ? 'Confirming...' : 'Withdraw' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TokenDisplay } from '@/types/token'
import type { DropdownMenuItem } from '@nuxt/ui'

interface Props {
  isOpen: boolean
  token?: TokenDisplay | null
  selectedToken?: TokenDisplay | null
  amount: string
  availableTokens?: TokenDisplay[]
  estimateFiat?: string
  isLoadingWithdraw?: boolean
  isConfirmingWithdraw?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  token: null,
  selectedToken: null,
  availableTokens: () => [],
  estimateFiat: '$0.00',
  isLoadingWithdraw: false,
  isConfirmingWithdraw: false
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'update:amount': [value: string]
  close: []
  submit: []
  setMax: []
  setPercent: [percent: number]
  selectToken: [token: TokenDisplay]
}>()

// 🔹 Use selected token if present, else single token prop
const activeToken = computed(() => props.selectedToken || props.token || null)

// 🔹 FIX: use `onSelect` so the event actually fires
const dropdownItems = computed<DropdownMenuItem[]>(() =>
  props.availableTokens.map((t) => ({
    label: `${t.symbol} — ${t.formattedBalance}`,
    onSelect: () => emit('selectToken', t)
  }))
)

const isValid = computed(() => {
  if (!activeToken.value) return false
  const amount = parseFloat(props.amount)
  const maxAmount = parseFloat(activeToken.value.formattedBalance)
  return !isNaN(amount) && amount > 0 && amount <= maxAmount
})
</script>
