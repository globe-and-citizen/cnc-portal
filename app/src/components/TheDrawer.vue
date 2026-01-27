<template>
  <div
    class="p-3 gap-4 flex flex-col h-screen max-h-screen backdrop-blur-md border-0 border-r-2 border-slate-100 transition-all duration-300 ease-in-out"
    :class="[isCollapsed ? 'w-24' : 'w-[280px]']"
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
              <div v-if="teams.isPending">
                <div class="p-4 flex gap-4 border-b-2">
                  <div class="skeleton w-11 h-11"></div>
                  <div class="flex flex-col gap-2">
                    <div class="skeleton w-11 h-4"></div>
                    <div class="skeleton w-28 h-4"></div>
                  </div>
                </div>
              </div>

              <!-- <pre>{{ teams.data   }}</pre> -->
              <RouterLink
                :to="`/teams/${team.id}`"
                v-else
                v-for="team in teams.data.value"
                :key="team.id"
                data-test="team-item"
              >
                <TeamMetaComponent
                  class="hover:bg-slate-100"
                  :isSelected="team.id === teamStore.currentTeamId"
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
      <div class="mb-4" :class="{ 'text-center': isCollapsed }">
        <span class="text-xs font-bold text-gray-400 tracking-tight"> General </span>
      </div>

      <nav class="menu rounded-box w-full">
        <ul class="space-y-4">
          <div v-for="(item, idx) in menuItems" :key="item.label">
            <div>
              <!-- if no children, direct link -->
              <RouterLink
                v-if="!item.children || item.children.length === 0"
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

              <!-- if has children -->
              <div v-else>
                <button
                  class="w-full min-w-11 min-h-11 flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 group transition-all duration-200 z-10 focus:outline-none"
                  :class="{
                    'bg-emerald-500/10 shadow-sm': item.active,
                    'hover:bg-gray-100 ': !item.active,
                    hidden: !item.show
                  }"
                  @click="toggleSubmenu(idx)"
                  type="button"
                >
                  <div class="relative">
                    <IconifyIcon :icon="item.icon" :class="getIconClass(item.active)" />
                  </div>
                  <span
                    v-if="!isCollapsed"
                    class="text-sm font-medium transition-colors duration-200 flex-1 text-left"
                    :class="{ 'text-emerald-600': item.active }"
                  >
                    {{ item.label }}
                  </span>
                  <IconifyIcon
                    v-if="!isCollapsed"
                    :icon="openSubmenus[idx] ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                    class="w-4 h-4 ml-auto text-gray-400 transition-transform duration-200"
                  />
                </button>

                <!-- Sub-items with vertical line -->
                <div v-show="openSubmenus[idx]" class="relative mt-2">
                  <!-- vertical line -->
                  <div
                    class="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"
                    v-if="!isCollapsed"
                  ></div>

                  <div class="space-y-2">
                    <div v-for="child in item.children" :key="child.label" class="relative">
                      <!-- horizontal line -->
                      <div
                        class="absolute left-6 top-1/2 w-4 h-0.5 bg-gray-200 -translate-y-1/2"
                        v-if="!isCollapsed"
                      ></div>

                      <RouterLink
                        :to="child.route"
                        class="min-w-10 min-h-11 flex items-center gap-3 px-4 py-3 ml-8 rounded-xl text-gray-600 group transition-all duration-200 z-10 relative"
                        :class="{
                          'bg-emerald-500/10 shadow-sm': child.active,
                          'hover:bg-gray-100': !child.active,
                          hidden: !child.show
                        }"
                      >
                        <!-- connection point -->
                        <div
                          class="absolute -left-4 top-1/2 w-2 h-2 bg-gray-300 rounded-full -translate-y-1/2"
                          :class="{ 'bg-emerald-500': child.active }"
                          v-if="!isCollapsed"
                        ></div>

                        <span
                          v-if="!isCollapsed"
                          class="text-sm font-medium transition-colors duration-200"
                          :class="{ 'text-emerald-600': child.active }"
                        >
                          {{ child.label }}
                        </span>
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ul>
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
import { useTeamStore, useAppStore, useUserDataStore } from '@/stores'
import { useRoute } from 'vue-router'
import { useTeamsQuery } from '@/queries/team.queries'
import type { User } from '@/types'
import { useTeamSafes } from '@/composables/safe'

const appStore = useAppStore()
const route = useRoute()
const userStore = useUserDataStore()
const teams = useTeamsQuery(userStore.address)

const isCollapsed = defineModel({
  type: Boolean
})
const props = defineProps<{
  user: User
}>()

const target = ref(null)
const isDropdownOpen = ref(false)
const teamStore = useTeamStore()
const { initialSafe } = useTeamSafes()

// Dropdown submenu state
const openSubmenus = ref<boolean[]>([])

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
  if (openSubmenus.value.length !== menuItems.value.length) {
    openSubmenus.value = Array(menuItems.value.length).fill(false)
  }
})

const emits = defineEmits(['openEditUserModal'])

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleSubmenu = (idx: number) => {
  openSubmenus.value = openSubmenus.value.map((isOpen, index) => (index === idx ? !isOpen : false))
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
    label: 'Teams List',
    icon: 'heroicons:squares-2x2',
    route: {
      name: 'teams'
    },
    active: route.name === 'teams',
    show: true
  },
  {
    label: 'Team Dashboard',
    icon: 'heroicons:home',
    route: {
      name: 'show-team',
      params: { id: teamStore.currentTeamId || '1' }
    },
    active: route.name === 'show-team',
    show: true
  },

  {
    label: 'Accounts',
    icon: 'heroicons:currency-dollar',
    route: {
      name: 'bank-account',
      params: { id: teamStore.currentTeamId || '1' }
    },

    // Active if any child is active or the parent route is active
    active:
      route.name === 'bank-account' ||
      route.name === 'expense-account' ||
      route.name === 'payroll-account' ||
      route.name === 'team-payroll' ||
      route.name === 'payroll-history' ||
      route.name === 'safe-account' ||
      (route.name === 'payroll-history' && route.params.memberAddress === userStore.address),
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0,
    children: [
      {
        label: 'Bank Account',
        icon: 'heroicons:banknotes',
        route: {
          name: 'bank-account',
          params: { id: teamStore.currentTeamId || '1' }
        },
        active: route.name === 'bank-account',
        show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
      },
      {
        label: 'Safe Account',
        icon: 'heroicons:shield-check',
        route: {
          name: 'safe-account',
          params: {
            id: teamStore.currentTeamId || '1',
            address: teamStore.currentTeamMeta?.data?.safeAddress || '0x'
          }
        },
        active: route.name === 'safe-account',
        show: teamStore.currentTeam?.safeAddress
      },
      {
        label: 'Expense Account ',
        icon: 'heroicons:briefcase',
        route: {
          name: 'expense-account',
          params: { id: teamStore.currentTeamId || '1' }
        },
        active: route.name === 'expense-account',
        show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
      },
      {
        label: 'Payroll Account',
        route: {
          name: 'payroll-account',
          params: { id: teamStore.currentTeamId || '1' }
        },
        active: route.name === 'payroll-account',
        show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
      },
      {
        label: 'My Payroll History',
        route: {
          name: 'payroll-history',
          params: { id: teamStore.currentTeamId || '1', memberAddress: userStore.address }
        },
        active:
          route.name === 'payroll-history' && route.params.memberAddress === userStore.address,
        show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
      },
      {
        label: ' Member Payroll History',
        route: {
          name: 'payroll-history',
          params: {
            id: teamStore.currentTeamId || '1',
            memberAddress: route.params.memberAddress
          }
        },
        // Active if on claim-history and not the current user
        active:
          route.name === 'payroll-history' && route.params.memberAddress !== userStore.address,
        show:
          (teamStore.currentTeam?.teamContracts ?? []).length > 0 &&
          !!route.params.memberAddress &&
          route.params.memberAddress !== userStore.address
      },
      {
        label: 'Team Payroll',
        route: {
          name: 'team-payroll',
          params: { id: teamStore.currentTeamId || '1' }
        },
        active: route.name === 'team-payroll',
        show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
      }
      // {
      // && isCashRemunerationOwner.value
      //   label: 'Payment Status',
      //   route: {
      //     name: 'weekly-claim',
      //     params: { id: teamStore.currentTeamId || '1' }
      //   },
      //   active: route.name === 'weekly-claim',
      //   show:
      //     (teamStore.currentTeam?.teamContracts ?? []).length > 0 && !isCashRemunerationOwner.value
      // }
    ].filter((child) => child.show)
  },

  {
    label: 'Contract Management',
    icon: 'heroicons:wrench',
    route: {
      name: 'contract-management',
      params: { id: teamStore.currentTeamId || '1' }
    },
    active: route.name === 'contract-management',
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
  },
  {
    label: 'SHER Token',
    icon: 'heroicons:chart-pie',
    route: {
      name: 'sher-token',
      params: { id: teamStore.currentTeamId || '1' }
    },
    active: route.name === 'sher-token',
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
  },
  {
    label: 'Trading',
    icon: 'heroicons:arrow-trending-up',
    route: {
      name: 'trading',
      params: { id: teamStore.currentTeamId || '1', address: initialSafe.value ?? '0x' }
    },
    active: route.name === 'trading',
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
  },
  {
    label: 'Administration',
    icon: 'heroicons:chart-bar',
    route: {
      name: 'bod-elections',
      params: { id: teamStore.currentTeamId || '1' }
    },
    active: route.name === 'bod-elections' || route.name === 'bod-proposals',
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0,
    children: [
      {
        label: 'BoD Election',
        route: {
          name: 'bod-elections',
          params: { id: teamStore.currentTeamId || '1' }
        },
        active: route.name === 'bod-elections',
        show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
      },
      {
        label: 'Proposals',
        route: {
          name: 'bod-proposals',
          params: { id: teamStore.currentTeamId || '1' }
        },
        active: route.name === 'bod-proposals',
        show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
      }
      // {
      //   label: 'Weekly Claim',
      //   route: {
      //     name: 'weekly-claim',
      //     params: { id: teamStore.currentTeamId || '1' }
      //   },
      //   active: route.name === 'weekly-claim',
      //   show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
      // }
    ].filter((child) => child.show)
  },
  {
    label: 'vesting',
    icon: 'heroicons:lock-closed',
    route: {
      name: 'vesting',
      params: { id: teamStore.currentTeamId || '1' }
    },
    active: route.name === 'vesting',
    show: (teamStore.currentTeam?.teamContracts ?? []).length > 0
  }
])

const toggleDropdown = () => {
  // teamStore.teamsMeta.reloadTeams()
  isDropdownOpen.value = !isDropdownOpen.value
}
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

/* Style pour la transition des sous-menus */
.space-y-2 > div {
  position: relative;
}

/* Animation pour la barre verticale */
.absolute.left-6 {
  transition: opacity 0.3s ease-in-out;
}

/* Point de connexion actif */
.absolute.-left-4.bg-emerald-500 {
  box-shadow:
    0 0 0 2px white,
    0 0 0 3px rgb(16 185 129);
}
</style>
