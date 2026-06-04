<template>
  <div class="flex items-center gap-2 py-0.5 pl-4">
    <span class="text-muted shrink-0 font-mono text-xs">{{ type }}</span>
    <UserComponent :user="resolveUser(to)" :compact="true" />
    <span v-if="percentage" class="text-muted text-xs">— {{ percentage }}</span>
    <span class="text-xs">— {{ formatCryptoAmount(String(amount)) }} {{ token }}</span>
    <span v-if="reason" class="text-muted text-xs">({{ reason }})</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveUser, formatCryptoAmount } from '@/utils'
import UserComponent from '@/components/UserComponent.vue'

const props = defineProps<{
  type: string
  to: string
  amount: string | number
  token: string
  reason?: string
  parentAmount?: string | number
}>()

const percentage = computed(() => {
  const parentAmt = Number(props.parentAmount)
  const childAmt = Number(props.amount)
  if (parentAmt > 0 && childAmt > 0) return `${((childAmt / parentAmt) * 100).toFixed(2)}%`
  return null
})
</script>
