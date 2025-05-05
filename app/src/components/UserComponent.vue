<template>
  <div
    class="flex flex-row justify-start gap-4 transition-all duration-300"
    :class="{ 'justify-center': isCollapsed }"
  >
    <div role="button" class="relative group">
      <div class="relative rounded-full overflow-hidden w-11 h-11 ring-2 ring-white/50">
        <img
          alt="User Avatar"
          :src="
            user.imageUrl ||
            'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
          "
          class="w-full h-full object-cover"
        />
      </div>
    </div>
    <div class="flex flex-col text-gray-600" v-if="!isCollapsed">
      <p class="font-bold text-sm line-clamp-1" data-test="user-name">
        {{ user.name || 'User' }}
      </p>
      <p class="text-sm" data-test="formatted-address">
        {{ formatedUserAddress }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { User } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  user: Pick<User, 'address' | 'name' | 'imageUrl'>
  isCollapsed?: boolean
}>()

const formatedUserAddress = computed(() => {
  return props.user.address
    ? props.user.address.substring(0, 6) +
        '...' +
        props.user.address.substring(props.user.address.length - 4)
    : ''
})
</script>
