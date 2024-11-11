<template>
  <div class="min-h-screen bg-base-200">
    <RouterView name="login" />
    <div v-if="userStore.isAuth">
      <!-- Responsive Navbar -->
      <NavBar
        @toggleSideButton="handleChange"
        @toggleEditUserModal="
          () => {
            updateUserInput = { name, address }
            showModal = true
          }
        "
        @withdraw="
          withdraw({
            abi: TIPS_ABI,
            address: TIPS_ADDRESS as Address,
            functionName: 'withdraw'
          })
        "
        :withdrawLoading="withdrawLoading && isConfirmingWithdraw"
        @getBalance="refetchBalance()"
        :balance="balance ? formatEther(balance as bigint).toString() : '0'"
        :balanceLoading="balanceLoading"
      />

      <!-- Responsive Drawer and Content -->
      <div class="lg:flex">
        <!-- Drawer -->
        <div
          v-if="toggleSide"
          class="fixed lg:relative inset-y-0 left-0 z-20 bg-base-100 shadow-xl transition-transform duration-300 ease-in-out"
          :class="{ '-translate-x-full': !toggleSide }"
        >
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

        <!-- Overlay -->
        <div
          v-if="toggleSide"
          data-test="drawer"
          class="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          @click="toggleSide = false"
        ></div>

        <!-- Content Wrapper -->
        <div
          class="flex-grow transition-all duration-300 ease-in-out"
          :class="{ 'lg:ml-72': toggleSide }"
        >
          <div class="p-5 mt-10 md:p-10">
            <RouterView />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal for User Update -->
    <ModalComponent v-model="showModal">
      <p class="font-bold text-2xl border-b-2 border-0 pb-3">Update User Data</p>
      <EditUserForm
        v-model="updateUserInput"
        @submitEditUser="handleUserUpdate"
        :isLoading="userIsUpdating"
      />
    </ModalComponent>

    <!-- Toast Notifications -->
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
import { useCustomFetch } from './composables/useCustomFetch'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import TIPS_ABI from '@/artifacts/abi/tips.json'
import { TIPS_ADDRESS } from './constant'
import { formatEther, type Address } from 'viem'

const { addErrorToast, addSuccessToast } = useToastStore()
const toggleSide = ref(true)
const showModal = ref(false)

function handleChange() {
  toggleSide.value = !toggleSide.value
}

const {
  isPending: withdrawLoading,
  error: withdrawError,
  writeContract: withdraw,
  data: withdrawHash
} = useWriteContract()

const { isPending: isConfirmingWithdraw, isSuccess: isSuccessConfirmed } =
  useWaitForTransactionReceipt({
    hash: withdrawHash
  })

const userStore = useUserDataStore()
const { name, address } = storeToRefs(userStore)

const {
  data: balance,
  isLoading: balanceLoading,
  error: balanceError,
  refetch: refetchBalance
} = useReadContract({
  abi: TIPS_ABI,
  address: TIPS_ADDRESS as Address,
  functionName: 'getBalance',
  args: [address.value as Address]
})

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

watch(balanceError, () => {
  if (balanceError.value) {
    addErrorToast('Failed to Get balance')
  }
})
watch(withdrawError, () => {
  addErrorToast('Failed to withdraw tips')
})

watch(isConfirmingWithdraw, (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isSuccessConfirmed.value) {
    addSuccessToast('Tips withdrawn successfully')
  }
})
</script>

<style scoped></style>
