<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref, watch, toRaw } from 'vue'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'

import Drawer from '@/components/TheDrawer.vue'
import NavBar from '@/components/NavBar.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import EditUserForm from '@/components/modals/EditUserForm.vue'

// import { useDark, useToggle } from '@vueuse/core'
import { useTipsBalance, useWithdrawTips } from './composables/tips'
import { useErrorHandler } from './composables/errorHandler'
import { useCustomFetch } from './composables/useCustomFetch'
const { addErrorToast, addSuccessToast } = useToastStore()

const toggleSide = ref(true)
const toggleModal = ref(false)

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
  address: address.value
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
            toggleModal = true
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
              :user="{ name, address }"
              @openEditUserModal="
                () => {
                  toggleModal = true
                  updateUserInput = { name, address }
                }
              "
            />
          </div>
        </div>
      </div>
    </div>

    <ModalComponent v-model="toggleModal">
      <p class="font-bold text-2xl border-b-2 border-0 pb-3">Update User Data</p>
      <EditUserForm v-model="updateUserInput" @submitEditUser="handleUserUpdate" 
      :isLoading="userIsUpdating"/>
    </ModalComponent>
    <ToastContainer position="bottom-right" />
  </div>
</template>

<style scoped></style>
