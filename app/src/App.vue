<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import Drawer from '@/components/TheDrawer.vue'
import NavBar from '@/components/NavBar.vue'
import NotificationToast from '@/components/NotificationToast.vue'
import { ref, watch, toRaw, onMounted } from 'vue'
import { useToastStore } from './stores/toast'
import { storeToRefs } from 'pinia'
import { useUserDataStore } from '@/stores/user'
import EditUserModal from '@/components/modals/EditUserModal.vue'
import { isAddress } from 'ethers'
import { FetchUserAPI } from './apis/userApi'
import { useTips } from '@/composables/tips'

const userApi = new FetchUserAPI()
const route = useRoute()

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
  name: name.value,
  address: address.value,
  isValid: true
})
const { getBalance, withdraw } = useTips()
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
onMounted(async () => {
  if (route.path != '/login') {
    await getBalance()
  }
})
</script>

<template>
  <div>
    <RouterView name="login" />
    <div v-if="$route.path != '/login'">
      <NavBar
        @toggleSideButton="handleChange"
        @toggleEditUserModal="
          () => {
            updateUserInput.name = name
            updateUserInput.address = address
            showUserModal = !showUserModal
          }
        "
        @withdraw="() => withdraw()"
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
              :showEditUserModal="showUserModal"
              v-model:updateUserInput="updateUserInput"
              @updateUser="handleUserUpdate"
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
