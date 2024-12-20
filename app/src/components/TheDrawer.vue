<template>
  <div
    class="flex flex-col fixed h-full bg-white shadow-lg"
    :class="[isCollapsed ? 'w-[72px]' : 'w-[280px]']"
  >
    <div class="p-4 flex items-center justify-between relative">
      <div class="absolute bottom-0 left-0 right-0 h-[1px]"></div>
      <div class="flex items-center gap-3" :class="{ 'justify-center w-full': isCollapsed }">
        <div class="relative group">
          <div class="absolute inset-0"></div>
          <img
            v-if="!isCollapsed"
            src="../assets/Logo.png"
            alt="CNC Portal"
            class="relative transition-all duration-300"
          />
          <img
            v-else
            src="../assets/LogoWithoutText.png"
            @click="toggleCollapse"
            alt="CNC Portal"
            class="w-10 h-10 relative transition-all duration-300 hover:scale-110"
          />
        </div>
      </div>
      <button
        v-if="!isCollapsed"
        @click="toggleCollapse"
        class="p-2 rounded-lg transition-all duration-200 hover:shadow-sm"
        :class="{ 'opacity-0': isCollapsed }"
      >
        <ArrowLeftIcon class="w-4 h-4 text-gray-600" />
      </button>
    </div>

    <!-- Team Selector with enhanced styling -->
    <div
      class="mx-4 mb-6 p-2 flex justify-between items-center gap-3 rounded-xl cursor-pointer"
      :class="{ 'justify-center': isCollapsed }"
    >
      <div class="w-3 h-3 rounded-lg flex items-center justify-center">
        <span class="text-sm font-medium text-pink-700">C</span>
      </div>
      <div class="flex flex-row justify-center items-center gap-2" v-if="!isCollapsed">
        <span class="text-sm font-medium text-gray-700">CNC Team</span>
        <ArrowDownIcon class="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
      </div>
    </div>

    <div class="flex-1 px-2">
      <div class="mb-2 px-4">
        <span
          class="text-xs font-medium text-gray-400 uppercase tracking-wider transition-opacity duration-200"
          :class="{ 'opacity-0': isCollapsed }"
        >
          General
        </span>
      </div>

      <nav class="space-y-1">
        <RouterLink
          v-for="item in menuItems"
          :key="item.label"
          :to="item.route"
          class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 group relative hover:shadow-sm"
          :class="{
            'justify-center': isCollapsed,
            'shadow-sm': item.active,
            'hover:bg-gray-50/80': !item.active
          }"
        >
          <div class="relative">
            <component
              :is="item.icon"
              class="w-5 h-5 transition-all duration-200 group-hover:scale-110"
              :class="{ 'text-blue-500': item.active }"
            />
            <div
              v-if="item.active"
              class="absolute inset-0 bg-blue-400/20 blur-xl transition-all duration-500 group-hover:blur-2xl"
            ></div>
          </div>
          <span v-if="!isCollapsed" class="text-sm font-medium transition-all duration-200">
            {{ item.label }}
          </span>
        </RouterLink>
      </nav>
    </div>

    <!-- Enhanced User Profile -->
    <div
      class="w-full flex flex-row justify-start gap-4 bg-opacity-10 backdrop-blur-lg rounded-xl px-5 py-4 cursor-pointer hover:bg-opacity-20 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
      data-test="edit-user-card"
      :class="{ 'justify-center': isCollapsed }"
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
      <div class="flex flex-col" v-if="!isCollapsed">
        <p
          class="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500"
          data-test="user-name"
        >
          {{ user.name || 'User' }}
        </p>
        <p class="text-xs text-slate-500" data-test="formatted-address">
          {{ formatedUserAddress }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  HomeIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  ArrowDownIcon,
  ArrowLeftIcon
} from '@heroicons/vue/24/outline'
interface User {
  name: string
  address: string
  avatarUrl?: string
}

const props = defineProps<{
  user: User
}>()

const emits = defineEmits(['openEditUserModal', 'toggleSideButton'])
const isCollapsed = ref(false)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  emits('toggleSideButton')
}
const formatedUserAddress = computed(() => {
  return props.user.address
    ? props.user.address.substring(0, 10) +
        '...' +
        props.user.address.substring(props.user.address.length - 4)
    : ''
})

const menuItems = [
  {
    label: 'Dashboard',
    icon: HomeIcon,
    route: '/',
    active: true
  },
  {
    label: 'Bank',
    icon: BanknotesIcon,
    route: '/bank'
  },
  {
    label: 'Transactions',
    icon: ChartBarIcon,
    route: '/transactions'
  },
  {
    label: 'Administration',
    icon: UsersIcon,
    route: '/admin'
  },
  {
    label: 'Contract Management',
    icon: DocumentTextIcon,
    route: '/contracts'
  }
]
</script>

<style scoped>
/* Ensure smooth width transitions */
.w-0 {
  width: 0;
  overflow: hidden;
}

/* Prevent text from wrapping during collapse animation */
.opacity-0 {
  white-space: nowrap;
}

/* Smooth backdrop blur transition */
.backdrop-blur-sm {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Enhanced transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
