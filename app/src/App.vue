<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref, watch, toRaw } from 'vue'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'

import Drawer from '@/components/TheDrawer.vue'
import NavBar from '@/components/NavBar.vue'
import EditUserModal from '@/components/modals/EditUserModal.vue'
import ToastContainer from '@/components/ToastContainer.vue'

import { isAddress } from 'ethers'
// import { useDark, useToggle } from '@vueuse/core'
import { useTipsBalance, useWithdrawTips } from './composables/tips'
import { ToastType } from './types'
import { useUpdateUser } from '@/composables/apis/user'
import { useErrorHandler } from './composables/errorHandler'
const { addToast } = useToastStore()

const toggleSide = ref(true)
function handleChange() {
  toggleSide.value = !toggleSide.value
}

const {
  isSuccess: withdrawSuccess,
  isLoading: withdrawLoading,
  error: withdrawError,
  execute: withdraw
} = useWithdrawTips()
const {
  data: balance,
  isLoading: balanceLoading,
  error: balanceError,
  execute: getBalance
} = useTipsBalance()

const userStore = useUserDataStore()
const { name, address } = storeToRefs(userStore)

const showUserModal = ref(false)

const updateUserInput = ref({
  name: name.value,
  address: address.value,
  isValid: true
})
const {
  userIsUpdating,
  isSuccess: userUpdateSuccess,
  error: userUpdateError,
  execute: updateUserAPI
} = useUpdateUser()
watch(userUpdateError, () => {
  if (userUpdateError.value) {
    useErrorHandler().handleError(userUpdateError.value || 'Failed to update user')
  }
})
watch(userUpdateSuccess, () => {
  if (userUpdateSuccess.value) {
    addToast({
      message: 'User updated',
      type: ToastType.Success,
      timeout: 5000
    })
    showUserModal.value = false
    userUpdateSuccess.value = false
  }
})
const handleUserUpdate = async () => {
  const user = await updateUserAPI(toRaw(updateUserInput.value))
  userStore.setUserData(user.name || '', user.address || '', user.nonce || '')
}
watch(
  () => updateUserInput.value.address,
  (newVal) => {
    updateUserInput.value.isValid = isAddress(newVal)
  }
)
// Handle authentication change (optional)
watch(
  () => userStore.isAuth,
  (isAuth) => {
    if (isAuth === true) {
      getBalance()
    }
  }
)
// Handle Balance error
watch(balanceError, () => {
  if (balanceError.value) {
    addToast({
      message: balanceError.value?.reason || 'Failed to Get balance',
      type: ToastType.Error,
      timeout: 5000
    })
  }
})
// Handle withdraw error
watch(withdrawError, () => {
  //toastStore.show(ToastType.Error, withdrawError.value.reason || 'Failed to withdraw tips')
  addToast({
    message: withdrawError.value.reason || 'Failed to withdraw tips',
    type: ToastType.Error,
    timeout: 5000
  })
})

// Handle withdraw success
watch(withdrawSuccess, () => {
  if (withdrawSuccess.value) {
    //toastStore.show(ToastType.Success, withdrawError.value.reason || 'Tips withdrawn successfully')
    addToast({
      message: withdrawError.value.reason || 'Tips withdrawn successfully',
      type: ToastType.Success,
      timeout: 5000
    })
  }
})
</script>

<template>
  <div class="min-h-screen m-0 bg-base-200">
    <RouterView name="login" />
    <div v-if="userStore.isAuth">
      <!-- 
        for toggleTheme
        @toggleTheme="() => toggleDark()" 
        :isDark="isDark"
      -->
      <NavBar
        @toggleSideButton="handleChange"
        @toggleEditUserModal="
          () => {
            updateUserInput.name = name
            updateUserInput.address = address
            showUserModal = !showUserModal
          }
        "
        @withdraw="withdraw()"
        :withdrawLoading="withdrawLoading"
        @getBalance="getBalance()"
        :balance="balance ? balance : '0'"
        :balanceLoading="balanceLoading"
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
              @toggleEditUserModal="
                () => {
                  updateUserInput.name = name
                  updateUserInput.address = address
                  showUserModal = !showUserModal
                }
              "
            />
            <EditUserModal
              :isLoading="userIsUpdating"
              :showEditUserModal="showUserModal"
              v-model:updateUserInput="updateUserInput"
              @updateUser="handleUserUpdate"
              @toggleEditUserModal="showUserModal = !showUserModal"
            />
          </div>
        </div>
      </div>
    </div>

    <ToastContainer position="bottom-right" />
  </div>
</template>

<style scoped></style>
