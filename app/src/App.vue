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

import { isAddress } from 'ethers'
import { FetchUserAPI } from './apis/userApi'
// import { useDark, useToggle } from '@vueuse/core'
import { useTipsBalance, useWithdrawTips } from './composables/tips'
const { addErrorToast, addSuccessToast } = useToastStore()

const userApi = new FetchUserAPI()

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
  address: address.value,
  isValid: true
})
const handleUserUpdate = async () => {
  const user = await userApi.updateUser(toRaw(updateUserInput.value))
  userStore.setUserData(user.name || '', user.address || '', user.nonce || '')
  showUserModal.value = false
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
              :name="name"
              :address="address"
              @toggleEditUserModal="
                () => {
                  toggleModal = true
                  updateUserInput.name = name
                  updateUserInput.address = address
                  // showUserModal = !showUserModal
                }
              "
            />

            <ModalComponent v-model="toggleModal">
              <p class="font-bold text-2xl border-b-2 border-0 pb-3">Update User Data</p>
              <EditUserForm v-model="updateUserInput" @submitEditUser="handleUserUpdate"/>
            </ModalComponent>
          </div>
        </div>
      </div>
    </div>

    <ToastContainer position="bottom-right" />
  </div>
</template>

<style scoped></style>
