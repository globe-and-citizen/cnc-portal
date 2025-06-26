<template>
  <div
    class="flex flex-row justify-start gap-4 transition-all duration-300"
    :class="{ 'justify-center flex-col items-center': isCollapsed }"
  >
    <div 
      role="button" 
      class="relative group"
    >
      <div 
        class="relative rounded-full overflow-hidden ring-2 ring-white/50"
        :class="{'ring-gray-200 w-24 h-24 ring-4': isCollapsed, 'w-11 h-11': !isCollapsed}"
      >
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
    <div 
      class="flex flex-col text-gray-600"
      :class="{'items-center text-center': isCollapsed}"
    >
      <p 
        class="font-bold line-clamp-1"
        :class="{'text-lg': isCollapsed, 'text-sm': !isCollapsed}" 
        data-test="user-name"
      >
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
