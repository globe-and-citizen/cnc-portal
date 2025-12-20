<template>
  <div class="min-h-screen bg-base-200">
    <LockScreen v-if="lock" :user="{ address: userStore.address }" />
    <template v-else>
      <RouterView name="login" />
      <div v-if="userStore.isAuth">
        <!-- Responsive Drawer and Content -->
        <div class="h-screen flex">
          <!-- Drawer -->
          <div class="bg-base-100 transition-transform duration-300 ease-in-out z-10">
            <Drawer
              :user="{ name, address, imageUrl }"
              v-model="toggleSide"
              @openEditUserModal="
                () => {
                  editUserModal = { mount: true, show: true }
                }
              "
            />
          </div>

          <!-- Content Wrapper -->
          <div
            class="flex-grow transition-all duration-300 ease-in-out overflow-x-hidden overflow-y-scroll"
          >
            <!-- Responsive Navbar -->
            <NavBar
              :isCollapsed="toggleSide"
              @toggleEditUserModal="
                () => {
                  editUserModal = { mount: true, show: true }
                }
              "
            />
            <div class="w-full p-5 md:p-10">
              <RouterView />
            </div>

            <!-- Overlay -->
            <div
              v-if="!toggleSide"
              data-test="drawer"
              class="absolute inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
              @click="toggleSide = true"
            ></div>
          </div>
        </div>
      </div>

      <!-- Modal for User Update -->
      <ModalComponent
        v-model="editUserModal.show"
        v-if="editUserModal.mount"
        @reset="
          () => {
            editUserModal = { mount: false, show: false }
          }
        "
      >
        <p class="font-bold text-2xl border-b-2 border-0 pb-3">Update User Data</p>
        <EditUserForm />
      </ModalComponent>
      <!-- Add Team Modal -->
      <ModalComponent v-model="appStore.showAddTeamModal" v-if="appStore.showAddTeamModal">
        <!-- May be return an event that will trigger team reload -->
        <AddTeamForm
          @done="
            () => {
              appStore.showAddTeamModal = false
              // TODO: Redirection depending on the current route
            }
          "
          v-if="appStore.showAddTeamModal"
        />
      </ModalComponent>

      <!-- Toast Notifications -->
      <ToastContainer position="bottom-left" />
    </template>
  </div>

  <VueQueryDevtools />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import { useBackendWake } from '@/composables/useBackendWake'
import { BACKEND_URL } from '@/constant'
import { useMutation, useQueryClient } from '@tanstack/vue-query'

import Drawer from '@/components/TheDrawer.vue'
import NavBar from '@/components/NavBar.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import EditUserForm from '@/components/forms/EditUserForm.vue'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'

import { useAccount } from '@wagmi/vue'
import { useAuth } from './composables/useAuth'
import { useAppStore } from './stores'
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
import '@vuepic/vue-datepicker/dist/main.css'
import LockScreen from './components/LockScreen.vue'
import { useTeamStore } from '@/stores/teamStore'
import { useAuthToken } from '@/composables/useAuthToken'

const { address: connectedAddress, isDisconnected } = useAccount()
const { addErrorToast } = useToastStore()
const appStore = useAppStore()
const { logout } = useAuth()
const toggleSide = ref(false)
const editUserModal = ref({ mount: false, show: false })

const userStore = useUserDataStore()
const { name, address, imageUrl } = storeToRefs(userStore)

const lock = computed(() => {
  return (
    userStore.isAuth && connectedAddress.value?.toLowerCase() !== userStore.address.toLowerCase()
  )
})

const teamStore = useTeamStore()
const authToken = useAuthToken()
const queryClient = useQueryClient()

async function syncWeeklyClaims(teamId: string, token: string) {
  const res = await fetch(`${BACKEND_URL}/api/weeklyclaim/sync/?teamId=${teamId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  })
  if (!res.ok) {
    throw new Error('Failed to sync weekly claims')
  }
  return res.json()
}

const syncMutation = useMutation({
  mutationFn: (teamId: string) => syncWeeklyClaims(teamId, authToken.value),
  onSuccess: (data) => {
    if (data.updated?.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['weekly-claims', teamStore.currentTeam?.id] })
    }
  },
  onError: () => {
    addErrorToast('Failed to sync weekly claims')
  }
})

watch(
  () => teamStore.currentTeam?.id,
  (teamId) => {
    if (teamId && userStore.isAuth) {
      syncMutation.mutate(teamId)
    }
  },
  { immediate: true }
)

watch(isDisconnected, (value) => {
  if (value && userStore.isAuth) {
    addErrorToast('Disconnected from wallet')
    setTimeout(() => {
      logout()
    }, 1000)
  }
})

// Wake up backend on app mount using TanStack Query
useBackendWake()
</script>
