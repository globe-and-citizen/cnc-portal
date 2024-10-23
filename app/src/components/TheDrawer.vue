<template>
  <div
    class="flex flex-col bg-gradient-to-br from-blue-900 to-green-900 items-center pt-28 w-80 min-h-full text-white fixed px-6 gap-6 shadow-2xl transition-all duration-300 ease-in-out transform"
  >
    <div
      class="w-full flex flex-row justify-start gap-4 bg-white bg-opacity-10 backdrop-blur-lg rounded-xl px-5 py-4 cursor-pointer hover:bg-opacity-20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
      @click="emits('openEditUserModal')"
    >
      <div tabindex="0" role="button" class="relative group">
        <div
          class="absolute rounded-full opacity-75 group-hover:opacity-100 transition duration-300 ease-in-out animate-tilt"
        ></div>
        <div class="relative rounded-full overflow-hidden w-[44px] h-[44px]">
          <img
            alt="User Avatar"
            :src="
              user.avatarUrl ||
              'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
            "
            class="w-full h-full object-cover transform transition duration-300 ease-in-out group-hover:scale-110"
          />
        </div>
      </div>
      <div class="flex flex-col">
        <p
          class="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500"
        >
          {{ user.name || 'User' }}
        </p>
        <p class="text-xs text-gray-300 font-mono">
          {{ formatedUserAddress }}
        </p>
      </div>
    </div>
    <ul class="menu w-full rounded-box gap-3 bg-white bg-opacity-5 backdrop-blur-sm p-4">
      <li class="menu-title opacity-75 uppercase tracking-wider text-xs font-bold mb-2">
        Navigation
      </li>
      <li v-for="(item, index) in menuItems" :key="index" class="relative group">
        <RouterLink
          :to="item.route"
          class="flex items-center py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-white hover:bg-opacity-10 group-hover:text-green-400"
        >
          <component
            :is="item.icon"
            class="w-6 h-6 mr-3 transition-transform duration-300 ease-in-out group-hover:rotate-12"
          />
          <span class="font-medium">{{ item.label }}</span>
          <div
            class="absolute right-2 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out"
          ></div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HomeIcon, UsersIcon, ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'

interface User {
  name: string
  address: string
  avatarUrl?: string
}

const emits = defineEmits(['openEditUserModal', 'logout'])
const props = defineProps<{
  user: User
}>()

const formatedUserAddress = computed(() => {
  return props.user.address
    ? props.user.address.substring(0, 6) +
        '...' +
        props.user.address.substring(props.user.address.length - 4)
    : ''
})

const menuItems = [
  { label: 'Dashboard', icon: HomeIcon, route: '/' },
  { label: 'Teams', icon: UsersIcon, route: '/teams' },
  { label: 'Transactions', icon: ClipboardDocumentListIcon, route: '/transactions' }
]
</script>

<style>
@keyframes tilt {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(1deg);
  }
  75% {
    transform: rotate(-1deg);
  }
}
.animate-tilt {
  animation: tilt 5s infinite ease-in-out;
}
</style>
