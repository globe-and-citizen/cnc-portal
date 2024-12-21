<template>
  <div
    class="flex flex-col fixed h-screen bg-white backdrop-blur-md shadow-2xl top-0 bottom-0 left-0 transition-all duration-300 ease-in-out"
    :class="[isCollapsed ? 'w-[72px]' : 'w-[280px]']"
  >
    <div class="p-6 flex items-center justify-between relative">
      <div class="flex items-center gap-3" :class="{ 'justify-center w-full': isCollapsed }">
        <div class="relative group cursor-pointer">
          <div
            class="absolute inset-0 rounded-full filter blur-md group-hover:blur-lg transition-all duration-300"
          ></div>
          <img
            v-if="!isCollapsed"
            src="../assets/Logo.png"
            alt="CNC Portal"
            class="relative z-10 w-[128px]"
          />
          <img
            v-else
            src="../assets/LogoWithoutText.png"
            @click="toggleCollapse"
            alt="CNC Portal"
            class="w-8 h-8 relative z-10 transition-transform duration-300 hover:scale-110"
          />
        </div>
      </div>
      <button
        v-if="!isCollapsed"
        @click="toggleCollapse"
        class="justify-center rounded-full hover:bg-gray-100 transition-colors duration-200"
      >
        <ArrowLeftCircleIcon class="w-5 h-5 text-gray-600" />
      </button>
    </div>
    <button
      v-if="isCollapsed"
      @click="toggleCollapse"
      class="flex flex-col items-center p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
    >
      <ArrowRightCircleIcon class="w-5 h-5 text-gray-600" />
    </button>
    <div
      class="mx-4 mb-8 flex items-center rounded-2xl cursor-pointer p-3 transition-all duration-300 shadow-lg"
      :class="[isCollapsed ? 'justify-center  ' : 'justify-between']"
    >
      <div class="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm">
        <span class="text-sm font-bold">C</span>
      </div>
      <div class="flex flex-row justify-center items-center gap-2" v-if="!isCollapsed">
        <span class="text-sm font-medium">CNC Team</span>
      </div>
      <ArrowDownIcon class="w-4 h-4 text-gray-600 group-hover:text-gray-600" v-if="!isCollapsed" />
    </div>

    <div class="flex-1 px-2 overflow-y-auto custom-scrollbar">
      <div class="mb-4 px-4">
        <span v-if="!isCollapsed" class="text-xs font-bold text-gray-400 uppercase tracking-wider">
          General
        </span>
      </div>

      <nav class="space-y-2">
        <RouterLink
          v-for="item in menuItems"
          :key="item.label"
          :to="item.route"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 group relative transition-all duration-200"
          :class="{
            'justify-center': isCollapsed,
            'bg-blue-500/10 shadow-md': item.active,
            'hover:bg-gray-100': !item.active
          }"
        >
          <div class="relative">
            <component
              :is="item.icon"
              class="w-6 h-6 transition-all duration-300 ease-in-out"
              :class="{
                'text-blue-500 scale-110': item.active,
                'group-hover:scale-110 group-hover:text-blue-500': !item.active
              }"
            />
          </div>
          <span
            v-if="!isCollapsed"
            class="text-sm font-medium transition-colors duration-200"
            :class="{ 'text-blue-600': item.active }"
          >
            {{ item.label }}
          </span>
        </RouterLink>
      </nav>
    </div>

    <div
      class="w-full flex flex-row justify-start gap-4 cursor-pointer transition-all duration-300 shadow-xl rounded-xl p-2"
      data-test="edit-user-card"
      :class="{ 'justify-center': isCollapsed }"
      @click="emits('openEditUserModal')"
    >
      <div tabindex="0" role="button" class="relative group">
        <div
          class="absolute inset-0 rounded-full filter blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300"
        ></div>
        <div class="relative rounded-full overflow-hidden w-12 h-12 ring-2 ring-white/50">
          <img
            alt="User Avatar"
            :src="
              user.avatarUrl ||
              'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
            "
            class="w-full h-full object-cover"
          />
        </div>
      </div>
      <div class="flex flex-col text-gray-600" v-if="!isCollapsed">
        <p class="font-bold text-lg" data-test="user-name">
          {{ user.name || 'User' }}
        </p>
        <p class="text-xs" data-test="formatted-address">
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
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon
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
    ? props.user.address.substring(0, 6) +
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
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 20px;
  border: transparent;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
