<template>
  <UBadge :color="meta.color" variant="soft" size="sm">
    <span class="h-1.5 w-1.5 rounded-full bg-current/70"></span>
    {{ meta.label }}
  </UBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OfferingDisplayStatus } from '@/types'
import { getFixedReturnStatusMeta } from '@/utils'

const props = defineProps<{ status: OfferingDisplayStatus }>()

const meta = computed(() => getFixedReturnStatusMeta(props.status))
</script>
