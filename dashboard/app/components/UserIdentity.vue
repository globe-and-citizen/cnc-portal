<template>
  <div class="flex items-center gap-2 min-w-0">
    <UAvatar
      :src="avatarSrc"
      :alt="user?.name || shortenedAddress"
      size="sm"
    >
      <template #fallback>
        <span class="text-xs font-semibold">
          {{ (user?.name || address || '?').charAt(0).toUpperCase() }}
        </span>
      </template>
    </UAvatar>

    <div class="min-w-0">
      <p
        v-if="user?.name"
        class="font-medium text-sm truncate leading-tight"
      >
        {{ user.name }}
      </p>
      <UBadge variant="subtle" color="neutral" class="px-1.5!">
        <span class="font-mono text-xs">{{ shortenedAddress }}</span>
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import { useUserQuery } from '~/queries/user.queries'
import { shortenAddress } from '~/utils/generalUtil'

const props = defineProps<{
  address: Address | undefined
}>()

// Pass a reactive getter so the query re-runs when the address changes.
const { data: user } = useUserQuery(() => props.address ?? '')

const shortenedAddress = computed(() =>
  props.address ? shortenAddress(props.address) : ''
)

// Mirror the backend/user-menu convention: fall back to DiceBear when the
// user record has no imageUrl, keyed deterministically on the address so
// the same address always renders the same placeholder.
const avatarSrc = computed<string | undefined>(() => {
  if (user.value?.imageUrl) return user.value.imageUrl
  if (!props.address) return undefined
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${props.address}`
})
</script>
