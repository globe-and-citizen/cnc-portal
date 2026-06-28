<template>
  <UApp>
    <div class="bg-muted min-h-screen">
      <LockScreen v-if="lock" :user="{ address: userStore.address }" />
      <template v-else>
        <RouterView name="login" />
        <div v-if="userStore.isAuth">
          <!-- Responsive Drawer and Content -->
          <UDashboardGroup v-if="route.name">
            <SidebarLayout v-if="route.name && route.name !== 'teams'"></SidebarLayout>
            <UDashboardPanel
              :ui="{
                body: 'overflow-x-hidden'
              }"
            >
              <template #header>
                <UDashboardNavbar :ui="{ right: 'gap-3' }" class="bg-default">
                  <template #leading>
                    <UDashboardSidebarCollapse
                      icon="heroicons:arrow-left-start-on-rectangle"
                      trailing
                      trailing-icon="heroicons:arrow-right-start-on-rectangle"
                      v-if="route.name && route.name !== 'teams'"
                    />
                  </template>
                  <template #title>
                    <NavBreadcrumb />
                  </template>
                  <template #right>
                    <!-- Team picker sits on the right, before the theme/notifications/avatar cluster -->
                    <TeamSelectMenu />
                    <NavBar />
                  </template>
                </UDashboardNavbar>
              </template>

              <template #body>
                <UContainer :ui="{ base: 'px-0 sm:px-0 lg:px-0' }">
                  <RouterView />
                </UContainer>
              </template>
            </UDashboardPanel>
          </UDashboardGroup>
        </div>
      </template>

      <VueQueryDevtools buttonPosition="bottom-left" />
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
import { useChainId, useConnection, useConnectionEffect, useSwitchChain } from '@wagmi/vue'
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import LockScreen from '@/components/LockScreen.vue'
import NavBar from '@/components/NavBar.vue'
import NavBreadcrumb from '@/components/NavBreadcrumb.vue'
import TeamSelectMenu from '@/components/TeamSelectMenu.vue'
import SidebarLayout from '@/components/ui/SidebarLayout.vue'

import { useAuth } from '@/composables/useAuth'
import { useBackendWake } from '@/composables/useBackendWake'

import { NETWORK } from '@/constant/index'
import { useUserDataStore } from '@/stores/index'

const route = useRoute()

const connection = useConnection()
const switchChain = useSwitchChain()

const networkChainId = parseInt(NETWORK.chainId)
const chainId = useChainId()
watch(chainId, (val) => {
  if (val === undefined) return

  switchChain.mutate({ chainId: networkChainId })
})
useBackendWake()

const toast = useToast()
const { logout } = useAuth()

const userStore = useUserDataStore()

const lock = computed(() => {
  if (
    userStore.isAuth &&
    connection.address?.value?.toLowerCase() !== userStore.address.toLowerCase()
  ) {
    return true
  }
  return false
})

useConnectionEffect({
  onDisconnect() {
    if (userStore.isAuth) {
      toast.add({ title: 'Disconnected from wallet', color: 'error' })
      logout()
    }
  }
})

// Wake up backend on app mount using TanStack Query
</script>
