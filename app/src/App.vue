<template>
  <div class="min-h-screen m-0 bg-base-200">
    <RouterView name="login" />
    <div v-if="userStore.isAuth">
      <NavBar
        @toggleSideButton="handleChange"
        @toggleEditUserModal="
          () => {
            updateUserInput = { name, address }
            showModal = true
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
                  showModal = true
                  updateUserInput = { name, address }
                }
              "
            />
          </div>
        </div>
      </div>
    </div>

    <ModalComponent v-model="showModal">
      <p class="font-bold text-2xl border-b-2 border-0 pb-3">Update User Data</p>
      <EditUserForm
        v-model="updateUserInput"
        @submitEditUser="handleUserUpdate"
        :isLoading="userIsUpdating"
      />
    </ModalComponent>
    <ToastContainer position="bottom-right" />
  </div>
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
import { useTipsBalance, useWithdrawTips } from './composables/tips'
import { useCustomFetch } from './composables/useCustomFetch'

const { addErrorToast, addSuccessToast } = useToastStore()
const toggleSide = ref(true)
const showModal = ref(false)

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

const updateUserInput = ref({
  name: name.value,
  address: address.value
})
const userUpdateEndpoint = ref('')
const {
  data: updatedUser,
  isFetching: userIsUpdating,
  error: userUpdateError,
  execute: executeUpdateUser
} = useCustomFetch(userUpdateEndpoint, { immediate: false }).put(updateUserInput).json()

watch(userUpdateError, () => {
  if (userUpdateError.value) {
    addErrorToast(userUpdateError.value || 'Failed to update user')
  }
})
watch(updatedUser, () => {
  if (updatedUser.value) {
    addSuccessToast('User updated')
    userStore.setUserData(
      updatedUser.value.name || '',
      updatedUser.value.address || '',
      updatedUser.value.nonce || ''
    )
  }
})

const handleUserUpdate = async () => {
  userUpdateEndpoint.value = `user/${address.value}`
  await executeUpdateUser()
}

watch([() => userIsUpdating.value, () => userUpdateError.value], () => {
  if (!userIsUpdating.value && !userUpdateError.value) {
    showModal.value = false
  }
})

watch(
  () => userStore.isAuth,
  (isAuth) => {
    if (isAuth === true) {
      getBalance()
    }
  },
  { immediate: true }
)

watch(balanceError, () => {
  if (balanceError.value) {
    addErrorToast('Failed to Get balance')
  }
})
watch(withdrawError, () => {
  addErrorToast('Failed to withdraw tips')
})

watch(withdrawSuccess, () => {
  if (withdrawSuccess.value) {
    addSuccessToast('Tips withdrawn successfully')
  }
})
</script>

<style scoped></style>
