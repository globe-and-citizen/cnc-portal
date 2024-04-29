<script setup lang="ts">
import { RouterView } from 'vue-router'
import Drawer from '@/components/TheDrawer.vue'
import NavBar from '@/components/NavBar.vue'
import NotificationToast from '@/components/NotificationToast.vue'
import { ref, watch } from 'vue'
import { useToastStore } from './stores/toast'
import { storeToRefs } from 'pinia'
import { useUserDataStore } from '@/stores/user'
import EditUserModal from '@/components/modals/EditUserModal.vue'
import { isAddress } from 'ethers'
const toggleSide = ref(true)
function handleChange() {
  toggleSide.value = !toggleSide.value
}

const toastStore = useToastStore()
const { showToast, type: toastType, message: toastMessage } = storeToRefs(toastStore)

const userStore = useUserDataStore()
const { name, address } = storeToRefs(userStore)

const showUserModal = ref(false)

const updateUserInput = ref({
  name: name,
  walletAddress: address,
  isValid: true
})
watch(
  () => updateUserInput.value,
  (newVal) => {
    updateUserInput.value.isValid = isAddress(newVal)
  }
)
</script>

<template>
  <div>
    <RouterView name="login" />
    <div v-if="$route.path != '/login'">
      <NavBar
        @toggleSideButton="handleChange"
        @toggleEditUserModal="showUserModal = !showUserModal"
      />
      <div class="content-wrapper">
        <div class="drawer lg:drawer-open">
          <div
            class="drawer-content flex flex-col"
            :style="{ marginLeft: toggleSide ? '300px' : '0' }"
          >
            <div class="m-20">
              <RouterView />
            </div>
          </div>
          <div v-if="toggleSide" @toggleSideButton="handleChange">
            <Drawer
              :name="name"
              :address="address"
              @toggleEditUserModal="showUserModal = !showUserModal"
            />
            <EditUserModal
              :showEditUserModal="showUserModal"
              v-model:updateUserInput="updateUserInput"
              @updateUser="console.log('Update user', updateUserInput)"
              @toggleEditUserModal="showUserModal = !showUserModal"
            />
          </div>
        </div>
      </div>
    </div>
    <NotificationToast v-if="showToast" :type="toastType" :message="toastMessage" />
  </div>
</template>

<style scoped></style>
