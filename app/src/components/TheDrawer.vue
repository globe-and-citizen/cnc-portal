<template>
  <div
    class="p-3 gap-4 flex flex-col h-screen max-h-screen backdrop-blur-md border-0 border-r-2 border-slate-100 transition-all duration-300 ease-in-out"
    :class="[isCollapsed ? 'w-20' : 'w-[280px]']"
  >
    <!-- Logo Group -->
    <div
      class="flex items-center justify-between relative transition-transform duration-300"
      :class="{ 'flex-col gap-3': isCollapsed }"
    >
      <div class="flex items-center gap-4" :class="{ 'justify-center w-full': isCollapsed }">
        <div class="relative group cursor-pointer p-3">
          <img
            v-if="!isCollapsed"
            src="../assets/Logo.png"
            alt="CNC Portal"
            class="relative w-[128px]"
          />
          <img
            v-else
            src="../assets/LogoWithoutText.png"
            @click="toggleCollapse"
            alt="CNC Portal"
            class="w-11 relative transition-transform duration-300 hover:scale-110"
          />
        </div>
      </div>
      <ButtonUI
        variant="glass"
        @click="toggleCollapse"
        class="shadow-sm"
        data-test="toggle-collapse"
      >
        <!-- I adde is collapsed class because data-test is not working on the icone -->
        <ArrowLeftStartOnRectangleIcon
          class="is-collapsed w-5 h-5 text-gray-600"
          v-if="isCollapsed"
        />
        <ArrowRightStartOnRectangleIcon class="not-collapsed w-5 h-5 text-gray-600" v-else />
      </ButtonUI>
    </div>
    <!-- Team Display Group -->
    <!-- TODO: Display "Select team" if the current team don't exist -->
    <div
      class="px-3 flex items-center cursor-pointer transition-all duration-300 drop-shadow-sm"
      :class="[isCollapsed ? 'justify-center' : 'justify-between']"
      data-test="team-display"
      @click="toggleDropdown"
      v-if="teamStore.currentTeam"
    >
      <div class="rounded-xl flex items-center justify-center backdrop-blur-sm bg-emerald-100">
        <span
          class="text-xl font-black text-emerald-700 w-11 h-11 flex items-center justify-center"
        >
          {{ teamStore.currentTeam?.name.charAt(0) }}
        </span>
      </div>
      <div class="flex flex-row justify-center items-center gap-8" v-if="!isCollapsed">
        <span class="text-sm font-medium text-gray-700">{{ teamStore.currentTeam?.name }}</span>
        <div class="relative">
          <button
            class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
          >
            <ChevronUpDownIcon class="w-4 h-4 text-gray-600" />
          </button>
          <transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <!-- Team Dropdown -->
            <div
              v-if="isDropdownOpen"
              class="absolute left-0 mt-2 bg-white rounded-2xl shadow-lg z-[9999]"
              data-test="team-dropdown"
              ref="target"
            >
              <div
                v-if="teamStore.teamsMeta.teamsAreFetching"
                class="flex items-center justify-center"
              >
                <div class="w-5 h-5 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
              </div>
              <RouterLink
                :to="`/teams/${team.id}`"
                v-else
                v-for="team in teamStore.teamsMeta.teams"
                :key="team.id"
                data-test="team-item"
              >
                <TeamMetaComponent class="hover:bg-slate-100" :team="team" :to="team.id"
              /></RouterLink>
              <!-- TODO: Make the button functional -->
              <div
                class="w-full flex justify-center items-center h-12 hover:bg-slate-100"
                data-test="add-team"
                @click="appStore.showAddTeamModal = true"
              >
                Create a new Team
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <div class="mb-4">
        <span class="text-xs font-bold text-gray-400 tracking-tight"> General </span>
      </div>

      <nav class="space-y-4">
        <RouterLink
          v-for="item in menuItems"
          :key="item.label"
          :to="item.route"
          class="min-w-11 min-h-11 flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 group transition-all duration-200 z-10"
          :class="{
            'bg-emerald-500/10 shadow-sm': item.active,
            'hover:bg-gray-100': !item.active,
            hidden: !item.show
          }"
        >
          <div class="relative">
            <component
              :is="item.icon"
              class="w-6 h-6 transition-all duration-300 ease-in-out"
              :class="{
                'text-emerald-500 scale-110': item.active,
                'group-hover:scale-110 group-hover:text-emerald-500': !item.active
              }"
            />
          </div>
          <span
            v-if="!isCollapsed"
            class="text-sm font-medium transition-colors duration-200"
            :class="{ 'text-emerald-600': item.active }"
          >
            {{ item.label }}
          </span>
        </RouterLink>
      </nav>
    </div>

    <!-- User Meta -->
    <div
      class="w-full bg-base-200 flex flex-row justify-start gap-4 cursor-pointer transition-all duration-300 shadow-sm rounded-xl p-4"
      data-test="edit-user-card"
      :class="{ 'justify-center': isCollapsed }"
      @click="emits('openEditUserModal')"
    >
      <div role="button" class="relative group">
        <div class="relative rounded-full overflow-hidden w-11 h-11 ring-2 ring-white/50">
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
        <p class="font-bold text-sm line-clamp-1" data-test="user-name">
          {{ user.name || 'User' }}
        </p>
        <p class="text-sm" data-test="formatted-address">
          {{ formatedUserAddress }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import {
  HomeIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  ArrowLeftStartOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronUpDownIcon,
  BriefcaseIcon,
  ChartPieIcon,
  WrenchIcon,
  CurrencyDollarIcon
} from '@heroicons/vue/24/outline'
import ButtonUI from './ButtonUI.vue'
import TeamMetaComponent from './TeamMetaComponent.vue'
import { useTeamStore, useAppStore } from '@/stores'
const appStore = useAppStore()

interface User {
  name: string
  address: string
  avatarUrl?: string
}

const isCollapsed = defineModel({
  type: Boolean
})
const props = defineProps<{
  user: User
}>()

const target = ref(null)
const isDropdownOpen = ref(false)
const teamStore = useTeamStore()

onMounted(() => {
  onClickOutside(target, () => {
    console.log('clicked outside')
    isDropdownOpen.value = false
  })
})

const emits = defineEmits(['openEditUserModal'])

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const formatedUserAddress = computed(() => {
  return props.user.address
    ? props.user.address.substring(0, 6) +
        '...' +
        props.user.address.substring(props.user.address.length - 4)
    : ''
})

const menuItems = computed(() => [
  {
    label: 'Dashboard',
    icon: HomeIcon,
    route: {
      name: 'show-team',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    active: true,
    show: true
  },
  {
    label: 'Bank',
    icon: BanknotesIcon,
    route: {
      name: 'bank',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    show: true
  },
  {
    label: 'Cash Remuneration',
    icon: CurrencyDollarIcon,
    route: {
      name: 'cash-remunerations',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    show: teamStore.currentTeam?.cashRemunerationEip712Address
  },
  {
    label: 'Expense Account ',
    icon: BriefcaseIcon,
    route: {
      name: 'expense-account',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    show: teamStore.currentTeam?.expenseAccountEip712Address
  },
  {
    label: 'SHER TOKEN',
    icon: ChartPieIcon,
    route: {
      name: 'bank',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    show: true
  },
  {
    label: 'Contract Management',
    icon: WrenchIcon,
    route: {
      name: 'bank',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    show: true
  },
  {
    label: 'Transactions',
    icon: ChartBarIcon,
    route: '/transactions',
    show: true
  },
  {
    label: 'Administration',
    icon: UsersIcon,
    route: '/admin',
    show: true
  }
])

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}
</script>

<style scoped>
* {
  /* border: 1px solid; */
}
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
  background-color: rgba(16, 185, 129, 0.5);
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
