<template>
  <div class="space-y-3" data-test="token-amount">
    <div class="flex w-full items-center justify-between px-1">
      <slot name="label">
        <div class="flex w-full items-center justify-between text-sm font-medium">
          <span>Action</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            Balance: {{ selectedToken?.balance ?? 0 }}
          </span>
        </div>
      </slot>
    </div>
    <div class="flex w-full flex-col gap-1">
      <UForm nested>
        <UFieldGroup class="w-full">
          <UFormField class="w-full" name="amount">
            <UInput
              v-model="amount"
              placeholder="0"
              inputmode="decimal"
              data-test="amountInput"
              :disabled="isLoading"
              aria-label="Amount"
              class="w-full"
              @input="handleAmountInput"
            >
            </UInput>

            <template #help>
              <div class="flex justify-between">
                <div class="flex flex-col gap-1">
                  <span
                    v-if="amount && parseFloat(amount) > 0"
                    class="text-sm text-gray-500 dark:text-gray-400"
                  >
                    ≈ {{ estimatedPrice }}
                  </span>
                </div>
                <div
                  class="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200"
                >
                  <UButton
                    v-for="percent in [25, 50, 75]"
                    :key="percent"
                    variant="outline"
                    size="xs"
                    color="neutral"
                    class="min-w-11"
                    :disabled="isLoading || !selectedToken || selectedToken.balance === 0"
                    :aria-label="`Set ${percent}% of balance`"
                    :data-test="`percentButton-${percent}`"
                    @click.stop="usePercentageOfBalance(percent)"
                  >
                    {{ percent }}%
                  </UButton>

                  <UButton
                    variant="outline"
                    size="xs"
                    color="neutral"
                    class="min-w-11"
                    data-test="maxButton"
                    :disabled="isLoading || !selectedToken || selectedToken.balance === 0"
                    aria-label="Set max balance"
                    @click.stop="useMaxBalance"
                  >
                    Max
                  </UButton>
                </div>
              </div>
            </template>
          </UFormField>
          <USelect
            v-model="selectedTokenId as TokenId"
            :items="tokenOptions"
            :disabled="isLoading || tokenOptions.length === 1"
            data-test="tokenSelect"
            size="xs"
            class="h-8 w-24"
          />
        </UFieldGroup>
      </UForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { z } from 'zod'
import { formatCurrencyShort } from '@/utils/currencyUtil'
import { useStorage } from '@vueuse/core'
import type { TokenOption } from '@/types'
import { type TokenId } from '@/constant'

const props = defineProps<{
  tokens: TokenOption[]
  modelValue: {
    amount: string
    tokenId: TokenId
  }
  isLoading?: boolean
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', value: { amount: string; tokenId: TokenId }): void
  (e: 'validation', isValid: boolean): void
}>()

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

const amount = computed({
  get: () => props.modelValue?.amount ?? '',
  set: (val: string) =>
    emits('update:modelValue', {
      amount: val,
      tokenId: props.modelValue?.tokenId ?? 'native'
    })
})

const selectedTokenId = computed({
  get: () => props.modelValue?.tokenId ?? 'native',
  set: (val: string) =>
    emits('update:modelValue', {
      amount: props.modelValue?.amount ?? '',
      tokenId: val as TokenId
    })
})

const tokenList = computed(() => props.tokens)
const tokenOptions = computed(() =>
  tokenList.value.map((token) => ({
    label: token.symbol,
    value: token.tokenId
  }))
)
const selectedToken = computed(() =>
  tokenList.value.find((b) => b.tokenId === selectedTokenId.value)
)

const availableBalance = computed(() => {
  const token = selectedToken.value
  if (!token) return 0
  return token.spendableBalance ?? token.balance ?? 0
})

const estimatedPrice = computed(() => {
  const price = selectedToken.value?.price ?? 0
  const code = currency.value?.code ?? 'USD'
  const value = (Number(amount.value) || 0) * price
  return formatCurrencyShort(value, code)
})

const schema = computed(() =>
  z.object({
    amount: z
      .string({ message: 'Amount is required' })
      .refine(
        (value) => value !== undefined && value !== null && value !== '',
        'Amount is required'
      )
      .refine((value) => /^\d*\.?\d*$/.test(value), 'Value is not a valid number')
      .refine((value) => !Number.isNaN(parseFloat(value)), 'Value is not a valid number')
      .refine((value) => parseFloat(value) > 0, 'Amount must be greater than 0')
      .refine((value) => parseFloat(value) <= availableBalance.value, 'Amount exceeds your balance')
  })
)

const useMaxBalance = () => {
  amount.value = String(availableBalance.value.toFixed(6))
}

const usePercentageOfBalance = (percentage: number) => {
  amount.value = (((availableBalance.value ?? 0) * percentage) / 100).toFixed(4)
}

const handleAmountInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/[^\d.]/g, '')
  const parts = value.split('.')
  if (parts.length > 2) {
    amount.value = parts[0] + '.' + parts.slice(1).join('')
  } else {
    amount.value = value
  }
}

// Emit validation state when amount or token changes
watch(
  () => [amount.value, selectedTokenId.value],
  () => {
    const result = schema.value.safeParse({ amount: amount.value })
    emits('validation', result.success)
  },
  { immediate: true }
)
</script>
