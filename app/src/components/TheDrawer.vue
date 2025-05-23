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
        <IconifyIcon
          icon="heroicons:arrow-left-start-on-rectangle"
          class="is-collapsed w-5 h-5 text-gray-600"
          v-if="isCollapsed"
        />
        <IconifyIcon
          icon="heroicons:arrow-right-start-on-rectangle"
          class="not-collapsed w-5 h-5 text-gray-600"
          v-else
        />
      </ButtonUI>
    </div>
    <!-- Team Display Group -->
    <div
      class="px-3 flex items-center cursor-pointer transition-all duration-300 drop-shadow-sm"
      :class="[isCollapsed ? 'justify-center' : 'justify-between']"
      data-test="team-display"
      @click="toggleDropdown"
    >
      <div class="rounded-xl flex items-center justify-center backdrop-blur-sm bg-emerald-100">
        <span
          class="text-xl font-black text-emerald-700 w-11 h-11 flex items-center justify-center"
        >
          {{ teamStore.currentTeam?.name.charAt(0) ?? 'N' }}
        </span>
      </div>
      <div class="flex flex-row justify-center items-center gap-8" v-if="!isCollapsed">
        <span
          class="text-sm font-medium text-gray-700"
          :class="teamStore.currentTeam?.name ? '' : 'border p-2'"
          >{{ teamStore.currentTeam?.name ?? 'Select Team' }}</span
        >
        <div class="relative">
          <button
            class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
          >
            <IconifyIcon icon="heroicons:chevron-up-down" class="w-4 h-4 text-gray-600" />
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
              <div v-if="teamStore.teamsMeta.teamsAreFetching">
                <div class="p-4 flex gap-4 border-b-2">
                  <div class="skeleton w-11 h-11"></div>
                  <div class="flex flex-col gap-2">
                    <div class="skeleton w-11 h-4"></div>
                    <div class="skeleton w-28 h-4"></div>
                  </div>
                </div>
              </div>

              <RouterLink
                :to="`/teams/${team.id}`"
                v-else
                v-for="team in teamStore.teamsMeta.teams"
                :key="team.id"
                data-test="team-item"
              >
                <TeamMetaComponent
                  class="hover:bg-slate-100"
                  :isSelected="team.id === teamStore.currentTeam?.id"
                  :team="team"
                  :to="team.id"
              /></RouterLink>
              <!-- TODO: Make the button functional -->
              <div class="min-w-40 w-full p-1">
                <div
                  class="flex justify-center items-center h-12 hover:bg-slate-100 rounded-xl"
                  data-test="add-team"
                  @click="appStore.showAddTeamModal = true"
                >
                  Create a new Team
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar border-b-2">
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
            <IconifyIcon :icon="item.icon" :class="getIconClass(item.active)" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from './ButtonUI.vue'
import TeamMetaComponent from './TeamMetaComponent.vue'
import { useTeamStore, useAppStore } from '@/stores'
import { useRoute } from 'vue-router'

const appStore = useAppStore()
const route = useRoute()

interface User {
  name: string
  address: string
  imageUrl?: string
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

const getIconClass = (active: boolean | undefined) => {
  return [
    'w-6 h-6 transition-all duration-300 ease-in-out',
    active ? 'text-emerald-500 scale-110' : 'group-hover:scale-110 group-hover:text-emerald-500'
  ].join(' ')
}

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
    icon: 'heroicons:home',
    route: {
      name: 'show-team',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    active: route.name === 'show-team',
    show: true
  },
  {
    label: 'Bank',
    icon: 'heroicons:banknotes',
    route: {
      name: 'bank',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    active: route.name === 'bank',
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
  },
  {
    label: 'Cash Remuneration',
    icon: 'heroicons:currency-dollar',
    route: {
      name: 'cash-remunerations',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    active: route.name === 'cash-remunerations',
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
  },
  {
    label: 'Expense Account ',
    icon: 'heroicons:briefcase',
    route: {
      name: 'expense-account',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    active: route.name === 'expense-account',
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
  },
  {
    label: 'Contract Management',
    icon: 'heroicons:wrench',
    route: {
      name: 'contract-management',
      params: { id: teamStore.currentTeam?.id || '1' }
    },
    active: route.name === 'contract-management',
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
  }
])

const toggleDropdown = () => {
  teamStore.teamsMeta.reloadTeams()
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
