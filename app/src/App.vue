<template>
  <UApp>
    <div class="bg-muted min-h-screen">
      <RouterView v-if="route.name === 'login'" name="login" />
      <LockScreen v-else-if="lock" :user="{ address: userStore.address }" />
      <NetworkLockScreen v-else-if="networkLocked" />
      <UDashboardGroup v-else-if="userStore.isAuth && route.name">
        <SidebarLayout />
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
              <TokenPriceStatusAlert />
              <RouterView />
            </UContainer>
          </template>
        </UDashboardPanel>
      </UDashboardGroup>
      <p
        v-else-if="!route.name && userStore.token && !userStore.isAuth"
        role="status"
        class="text-muted py-10 text-center"
      >
        Checking your session…
      </p>

      <VueQueryDevtools buttonPosition="bottom-left" />
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
import { useConnection, useConnectionEffect } from '@wagmi/vue'
import { computed, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import LockScreen from '@/components/layout/LockScreen.vue'
import NetworkLockScreen from '@/components/layout/NetworkLockScreen.vue'
import NavBar from '@/components/layout/NavBar.vue'
import NavBreadcrumb from '@/components/layout/NavBreadcrumb.vue'
import TeamSelectMenu from '@/components/layout/TeamSelectMenu.vue'
import TokenPriceStatusAlert from '@/components/ui/TokenPriceStatusAlert.vue'
import SidebarLayout from '@/components/ui/SidebarLayout.vue'

import { useBackendWake } from '@/composables/useBackendWake'

import { configuredChainId } from '@/lib/walletNetwork'
import { useUserDataStore } from '@/stores/index'

const route = useRoute()
const router = useRouter()

const connection = useConnection()
useBackendWake()

const toast = useToast()

const userStore = useUserDataStore()
watch(
  () => userStore.isAuth,
  (authenticated) => {
    if (!authenticated && route.name !== 'login') void router.replace({ name: 'login' })
  }
)
const networkLocked = computed(
  () => userStore.isAuth && connection.chainId.value !== configuredChainId
)

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
      userStore.clearUserData()
    }
  }
})

// Wake up backend on app mount using TanStack Query
</script>
