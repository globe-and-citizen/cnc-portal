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
import { useErrorHandler } from './composables/errorHandler'
import { useCustomFetch } from './composables/useCustomFetch'
const { addErrorToast, addSuccessToast } = useToastStore()

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
const updateUserInputString = ref(JSON.stringify(updateUserInput.value))
const {
  isFetching: userIsUpdating,
  response: userUpdateResponse,
  error: userUpdateError,
  execute: updateUserAPI
} = useCustomFetch(`user/${address.value}`, { immediate: false }).put(updateUserInputString).json()
watch(userUpdateError, () => {
  if (userUpdateError.value) {
    useErrorHandler().handleError(userUpdateError.value || 'Failed to update user')
  }
})
watch(userUpdateResponse, async () => {
  if (userUpdateResponse.value?.ok) {
    addSuccessToast('User updated')
    const user = await userUpdateResponse.value?.json()
    userStore.setUserData(user.name || '', user.address || '', user.nonce || '')
    showUserModal.value = false
  }
})

const handleUserUpdate = async () => {
  updateUserInputString.value = JSON.stringify(toRaw(updateUserInput.value))
  await updateUserAPI()
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
    addErrorToast(balanceError.value?.reason || 'Failed to Get balance')
  }
})
// Handle withdraw error
watch(withdrawError, () => {
  addErrorToast(withdrawError.value.reason || 'Failed to withdraw tips')
})

// Handle withdraw success
watch(withdrawSuccess, () => {
  if (withdrawSuccess.value) {
    addSuccessToast('Tips withdrawn successfully')
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
