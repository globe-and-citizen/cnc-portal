<template>
  <div
    class="flex transition-all duration-300"
    :class="{
      'flex-row justify-start gap-4': layout === 'default',
      'justify-center flex-col items-center': isCollapsed || isDetailedView,
      'flex-row items-start items-center gap-3': layout === 'alternate'
    }"
  >
    <div role="button" class="relative group">
      <div
        class="relative rounded-full overflow-hidden"
        :class="{
          'ring-gray-200 w-24 h-24 ring-4': isDetailedView,
          'w-11 h-11 ring-2 ring-white/50': !isDetailedView && layout === 'default',
          'w-16 h-16': layout === 'alternate' && !isDetailedView
        }"
      >
        <img
          alt="User Avatar"
          :src="user.imageUrl || defaultAvatar"
          class="w-full h-full object-cover"
        />
      </div>
    </div>
    <div
      v-if="!isCollapsed"
      class="flex text-gray-600"
      :class="{
        'flex-col items-center text-center': isDetailedView,
        'flex-col': layout === 'default' && !isDetailedView,
        'flex-row items-center gap-2': layout === 'alternate'
      }"
    >
      <div v-if="layout === 'alternate'" class="flex flex-col">
        <p
          class="font-bold"
          :class="{
            'text-lg': isDetailedView,
            'text-sm': !isDetailedView && layout === ('default' as 'default' | 'alternate'),
            'text-xl leading-tight': layout === 'alternate'
          }"
          data-test="user-name"
        >
          {{ user.name || 'User' }}
        </p>
        <p
          class="text-gray-400"
          :class="{
            'text-sm': isDetailedView,
            'text-xs': !isDetailedView,
            'text-xs leading-tight': layout === 'alternate'
          }"
          data-test="formatted-address"
        >
          {{ formatedUserAddress }}
        </p>
      </div>
      <template v-else>
        <p
          class="font-bold line-clamp-1"
          :class="{
            'text-lg': isDetailedView,
            'text-sm': !isDetailedView
          }"
          data-test="user-name"
        >
          {{ user.name || 'User' }}
        </p>
        <p
          v-if="isDetailedView"
          class="text-gray-400 font-bold mt-2"
          :class="{ 'text-sm': isDetailedView, 'text-xs': !isDetailedView }"
          data-test="user-role"
        >
          {{ user.role || 'Member' }}
        </p>
        <p class="text-sm" data-test="formatted-address">
          {{ formatedUserAddress }}
        </p>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { User } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  user: Pick<User, 'address' | 'name' | 'imageUrl'> & { role?: string }
  isCollapsed?: boolean
  isDetailedView?: boolean
  layout?: 'default' | 'alternate'
}>()

const defaultAvatar = 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'

const formatedUserAddress = computed(() => {
  return props.user.address
    ? props.user.address.substring(0, 6) +
        '...' +
        props.user.address.substring(props.user.address.length - 4)
    : ''
})
</script>
