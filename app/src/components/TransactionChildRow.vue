<template>
  <div class="flex items-center gap-2 py-0.5 pl-4">
    <UBadge :color="color" variant="soft">{{ getTransactionTypeLabel(type) }}</UBadge>
    <UserComponent :user="resolveUser(otherAddress)" :compact="true" />
    <span v-if="percentage" class="text-muted text-xs">— {{ percentage }}</span>
    <span v-if="Number(amount) > 0 && token !== '-'" class="text-muted text-xs">
      · {{ formatCryptoAmount(String(amount)) }} {{ token }}
    </span>
    <span v-if="reason" class="text-muted text-xs">({{ reason }})</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveUser, formatCryptoAmount, getTransactionTypeLabel } from '@/utils'
import type { UBadgeColor } from '@/types/ui'
import UserComponent from '@/components/UserComponent.vue'

const props = withDefaults(
  defineProps<{
    type: string
    otherAddress: string
    amount: string | number
    token: string
    color?: UBadgeColor
    reason?: string
    parentAmount?: string | number
  }>(),
  { color: 'primary' }
)

const percentage = computed(() => {
  const parentAmt = Number(props.parentAmount)
  const childAmt = Number(props.amount)
  if (parentAmt > 0 && childAmt > 0) return `${((childAmt / parentAmt) * 100).toFixed(2)}%`
  return null
})
</script>
