<template>
  <div class="space-y-2">
    <label class="text-sm text-gray-500">Number of Shares</label>
    <input
      type="number"
      placeholder="Enter amount"
      v-model.trim="shares"
      class="input input-bordered w-full font-mono text-lg h-14"
      min="0"
      step="1"
    />
    <div class="text-error text-xs mt-1">
      <div v-for="error in v$.shares.$errors" :key="error.$uid">
        {{ error.$message }}
      </div>
    </div>
  </div>

  <!-- Limit Price Input - Only shown for Limit orders -->
  <div v-if="orderType === 'limit'" class="space-y-2">
    <label class="text-sm text-gray-500">Limit Price</label>
    <input
      type="number"
      placeholder="Enter limit price"
      class="input input-bordered w-full font-mono text-lg h-14"
      min="0"
      step="0.01"
      v-model.trim="limitPrice"
    />
    <div class="text-error text-xs mt-1">
      <div v-for="error in v$.limitPrice.$errors" :key="error.$uid">
        {{ error.$message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  Validation,
  ValidationRuleWithoutParams,
  ValidationRuleWithParams
} from '@vuelidate/core'
import type { Ref } from 'vue'

const shares = defineModel('shares', { default: '' })
const limitPrice = defineModel('limitPrice', { default: '' })
defineProps<{
  orderType: 'market' | 'limit'
  v$: Validation<
    {
      shares: {
        required: ValidationRuleWithoutParams<unknown>
        nonZero: ValidationRuleWithParams<object, unknown>
        marketMinimum: ValidationRuleWithParams<object, unknown>
        limitMinimum: ValidationRuleWithParams<object, unknown>
      }
      limitPrice: {
        requiredIfLimit: ValidationRuleWithParams<object, unknown>
      }
    },
    {
      shares: Ref<string, string>
      limitPrice: Ref<string, string>
    }
  >
}>()
</script>
