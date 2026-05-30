<template>
  <div class="flex items-center gap-2 py-0.5 pl-4">
    <span class="text-muted shrink-0 font-mono text-xs">{{ type }}</span>
    <UserComponent :user="resolveUser(otherAddress)" :compact="true" />
    <span v-if="Number(amount) > 0 && token !== '-'" class="text-muted text-xs">
      · {{ formatCryptoAmount(String(amount)) }} {{ token }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { resolveUser, formatCryptoAmount } from '@/utils'
import UserComponent from '@/components/UserComponent.vue'

defineProps<{
  type: string
  otherAddress: string
  amount: string | number
  token: string
}>()
</script>
