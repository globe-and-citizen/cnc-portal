<template>
  <div class="min-h-screen bg-base-200">
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
  </div>

  <VueQueryDevtools />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'

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
const { addErrorToast } = useToastStore()

const appStore = useAppStore()
const { isDisconnected } = useAccount()
const { logout } = useAuth()
const toggleSide = ref(false)
const editUserModal = ref({ mount: false, show: false })

const userStore = useUserDataStore()
const { name, address, imageUrl } = storeToRefs(userStore)

watch(isDisconnected, (value) => {
  if (value && userStore.isAuth) {
    addErrorToast('Disconnected from wallet')
    setTimeout(() => {
      logout()
    }, 3000)
  }
})
</script>
