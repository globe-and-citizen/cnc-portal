<template>
  <UDashboardSidebar
    collapsible
    resizable
    class="bg-white"
    :ui="{ root: 'min-w-24', footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed }">
      <div class="relative group cursor-pointer p-3">
        <img
          v-show="!collapsed"
          src="../../assets/Logo.png"
          alt="CNC Portal"
          class="relative w-full"
        />
        <img
          v-show="collapsed"
          src="../../assets/LogoWithoutText.png"
          alt="CNC Portal"
          class="w-full relative transition-transform duration-300 hover:scale-110"
        />
      </div>
    </template>

    <template #default="{ collapsed }">
      <!-- TODO: Enable search for later -->
      <!-- <UButton
        :label="collapsed ? undefined : 'Search...'"
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        block
        size="xl"
        :square="collapsed"
      >
        <template v-if="!collapsed" #trailing>
          <div class="flex items-center gap-0.5 ms-auto">
            <UKbd value="meta" variant="subtle" />
            <UKbd value="K" variant="subtle" />
          </div>
        </template>
      </UButton> -->

      <UNavigationMenu
        :collapsed="collapsed"
        :items="items"
        orientation="vertical"
        :ui="{
          list: 'flex flex-col gap-2',
          link: 'text-md gap-3 px-4 py-3 rounded-xl',
          linkLeadingIcon: 'size-6'
        }"
      />
    </template>

    <template #footer="{ collapsed }">
      <!-- User Meta -->
      <UModal v-model:open="open" title="Update User Data">
        <div
          class="w-full bg-base-200 flex flex-row justify-start gap-4 cursor-pointer transition-all duration-300 shadow-xs rounded-xl p-4"
          data-test="edit-user-card"
          :class="{ 'justify-center': collapsed }"
          @click="open = true"
        >
          <div role="button" class="relative group">
            <div class="relative rounded-full overflow-hidden w-11 h-11 ring-2 ring-white/50">
              <img
                alt="User Avatar"
                :src="
                  userStore.imageUrl ||
                  'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
                "
                class="w-full h-full object-cover"
              />
            </div>
          </div>
          <div class="flex flex-col text-gray-600" v-if="!collapsed">
            <p class="font-bold text-sm line-clamp-1" data-test="user-name">
              {{ userStore.name || 'User' }}
            </p>
            <p class="text-sm" data-test="formatted-address">
              {{ formatedUserAddress }}
            </p>
          </div>
        </div>

        <template #body>
          <EditUserForm />
        </template>
      </UModal>
    </template>
  </UDashboardSidebar>
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores/teamStore'
import { useUserDataStore } from '@/stores/user'
import type { NavigationMenuItem } from '@nuxt/ui'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { formatAddress } from '@/utils/formatAddress'

const route = useRoute()
const userStore = useUserDataStore()
const teamStore = useTeamStore()

const open = ref(false)

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/'
  },
  {
    label: 'Team List',
    icon: 'heroicons:squares-2x2',
    to: '/teams'
  },
  {
    label: 'Team Home Page',
    icon: 'heroicons:home',
    to: `/teams/${teamStore.currentTeamId || '1'}`
  },
  {
    label: 'Accounts',
    icon: 'heroicons:currency-dollar',
    to: {
      name: 'bank-account',
      params: { id: teamStore.currentTeamId || '1' }
    },
    defaultOpen: true,
    children: [
      {
        label: 'Bank Account',
        // icon: 'heroicons:banknotes',
        to: {
          name: 'bank-account',
          params: { id: teamStore.currentTeamId || '1' }
        }
      },
      {
        label: 'Safe Account',
        // icon: 'heroicons:shield-check',
        to: {
          name: 'safe-account',
          params: {
            id: teamStore.currentTeamId || '1',
            address: teamStore.currentTeamMeta?.data?.safeAddress || '0x'
          }
        }
      },
      {
        label: 'Expense Account ',
        // icon: 'heroicons:briefcase',
        to: {
          name: 'expense-account',
          params: { id: teamStore.currentTeamId || '1' }
        }
      },
      {
        // icon: 'heroicons:briefcase',
        label: 'Payroll Account',
        to: {
          name: 'payroll-account',
          params: { id: teamStore.currentTeamId || '1' }
        }
      },
      {
        // icon: 'heroicons:briefcase',
        label:
          route.name === 'payroll-history' && route.params.memberAddress !== userStore.address
            ? 'Member Payroll History'
            : 'My Payroll History',
        to: {
          name: 'payroll-history',
          params: { id: teamStore.currentTeamId || '1', memberAddress: userStore.address }
        }
      },

      {
        // icon: 'heroicons:briefcase',
        label: 'Team Payroll',
        to: {
          name: 'team-payroll',
          params: { id: teamStore.currentTeamId || '1' }
        }
      }
    ]
  },
  {
    label: 'Contract Management',
    icon: 'heroicons:wrench',
    to: {
      name: 'contract-management',
      params: { id: teamStore.currentTeamId || '1' }
    }
  },
  {
    label: 'SHER Token',
    icon: 'heroicons:chart-pie',
    to: {
      name: 'sher-token',
      params: { id: teamStore.currentTeamId || '1' }
    }
  },

  {
    label: 'Administration',
    icon: 'heroicons:chart-bar',
    to: {
      name: 'bod-elections',
      params: { id: teamStore.currentTeamId || '1' }
    },
    children: [
      {
        label: 'BoD Election',
        to: {
          name: 'bod-elections',
          params: { id: teamStore.currentTeamId || '1' }
        }
      },
      {
        label: 'Proposals',
        to: {
          name: 'bod-proposals',
          params: { id: teamStore.currentTeamId || '1' }
        }
      }
    ]
  },
  {
    label: 'vesting',
    icon: 'heroicons:lock-closed',
    to: {
      name: 'vesting',
      params: { id: teamStore.currentTeamId || '1' }
    }
  }
])

const formatedUserAddress = computed(() => formatAddress(userStore.address))
</script>

<style scoped></style>
