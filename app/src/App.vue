<template>
  <UApp>
    <div class="min-h-screen bg-base-200">
      <LockScreen v-if="lock" :user="{ address: userStore.address }" />
      <template v-else>
        <RouterView name="login" />
        <div v-if="userStore.isAuth">
          <!-- Responsive Drawer and Content -->
          <UDashboardGroup>
            <SidebarLayout></SidebarLayout>
            <UDashboardPanel
              :ui="{
                body: 'overflow-x-hidden'
              }"
            >
              <template #header>
                <UDashboardNavbar :title="pageTitle" :ui="{ right: 'gap-3' }" class="bg-white">
                  <template #leading>
                    <UDashboardSidebarCollapse
                      icon="heroicons:arrow-left-start-on-rectangle"
                      trailing
                      trailing-icon="heroicons:arrow-right-start-on-rectangle"
                    />
                  </template>
                  <template #right>
                    <NavBar />
                  </template>
                </UDashboardNavbar>
              </template>

              <template #body>
                <RouterView />
              </template>
            </UDashboardPanel>
          </UDashboardGroup>
        </div>
      </template>

      <!-- Toast Notifications -->
      <ToastContainer position="bottom-left" />
      <VueQueryDevtools buttonPosition="bottom-left" :style="{ height: '1500px' }" />
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
import '@vuepic/vue-datepicker/dist/main.css'
import { useChainId, useConnection, useConnectionEffect, useSwitchChain } from '@wagmi/vue'
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import LockScreen from '@/components/LockScreen.vue'
import NavBar from '@/components/NavBar.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import SidebarLayout from '@/components/ui/SidebarLayout.vue'

import { useAuth } from '@/composables/useAuth'
import { useBackendWake } from '@/composables/useBackendWake'
import { useGetUserQuery } from '@/queries/user.queries'

import { NETWORK } from '@/constant/index'
import { useToastStore, useUserDataStore } from '@/stores/index'

const route = useRoute()

const pageTitle = computed<string>(() => (route.meta.name as string) || 'CNC-Portal')

const connection = useConnection()
const switchChain = useSwitchChain()

const networkChainId = parseInt(NETWORK.chainId)
const chainId = useChainId()
watch(chainId, (val) => {
  if (val === undefined) return

  switchChain.mutate({ chainId: networkChainId })
})
useBackendWake()

const { addErrorToast } = useToastStore()
const { logout } = useAuth()

const userStore = useUserDataStore()

const {
  data: syncedUser,
  refetch: refetchSyncedUser,
  isSuccess: isUserSyncSuccess
} = useGetUserQuery({ pathParams: { address: computed(() => userStore.address || undefined) } })

watch(
  [() => userStore.isAuth, () => userStore.address],
  async ([isAuth, address]) => {
    if (!isAuth || !address) {
      return
    }

    const result = await refetchSyncedUser()
    const user = result.data ?? syncedUser.value

    if (!user) {
      return
    }

    userStore.setUserData(
      user.name || '',
      (user.address || '') as `0x${string}`,
      user.nonce || '',
      user.imageUrl || ''
    )
  },
  { immediate: true }
)

watch([() => isUserSyncSuccess.value, () => syncedUser.value], ([success, user]) => {
  if (!success || !user || !userStore.isAuth) {
    return
  }

  userStore.setUserData(
    user.name || '',
    (user.address || '') as `0x${string}`,
    user.nonce || '',
    user.imageUrl || ''
  )
})

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
      addErrorToast('Disconnected from wallet')
      logout()
    }
  }
})

// Wake up backend on app mount using TanStack Query
</script>
