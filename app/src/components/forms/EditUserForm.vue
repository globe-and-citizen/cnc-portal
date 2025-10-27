<template>
  <div class="flex flex-col gap-5 mt-4 overflow-hidden" data-test="edit-user-modal">
    <!-- Wallet Address -->
    <div role="alert" class="alert shadow-sm flex text-gray-700">
      <div class="flex flex-wrap gap-2">
        <h3 class="font-bold">Wallet Address</h3>
        <div class="flex items-center gap-2">
          <ToolTip data-test="address-tooltip" content="Click to see address in block explorer">
            <div
              type="text"
              class="w-full cursor-pointer"
              @click="openExplorer(userStore.address)"
              data-test="user-address"
              readonly
            >
              {{ userStore.address }}
            </div>
          </ToolTip>
          <ToolTip
            data-test="copy-address-tooltip"
            :content="copied ? 'Copied!' : 'Click to copy address'"
          >
            <IconifyIcon
              v-if="isSupported && !copied"
              data-test="copy-address-icon"
              class="w-5 h-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              @click="copy(userStore.address)"
              icon="heroicons:clipboard-document"
            />
            <IconifyIcon
              v-if="copied"
              data-test="copied-icon"
              class="w-5 h-5 text-emerald-500"
              icon="heroicons:check"
            />
          </ToolTip>
        </div>
      </div>
    </div>

    <!-- Input Name -->
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-24" data-test="name-label">Name</span>
      <input
        type="text"
        class="grow"
        data-test="name-input"
        placeholder="John Doe"
        v-model="userCopy.name"
      />
    </label>
    <div
      class="pl-4 text-red-500 text-sm"
      v-for="error of $v.user.name.$errors"
      :key="error.$uid"
      data-test="name-error"
    >
      {{ error.$message }}
    </div>

    <!-- Currency -->
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-40" data-test="currency-label">Default Currency</span>
      <select
        v-if="LIST_CURRENCIES && LIST_CURRENCIES.length"
        v-model="selectedCurrency"
        @change="handleCurrencyChange"
        data-test="currency-select"
        class="select select-sm w-full focus:border-none focus:outline-none"
      >
        <option
          v-for="currency in LIST_CURRENCIES"
          :key="currency.code"
          :selected="currencyStore.localCurrency?.code == currency.code"
          :value="currency.code"
        >
          {{ currency.code }}
        </option>
      </select>
    </label>

    <!-- Upload -->
    <UploadImage
      :model-value="userCopy.imageUrl"
      @update:model-value="($event) => (userCopy.imageUrl = $event)"
    />
  </div>
  <div class="modal-action justify-end">
    <ButtonUI
      v-if="hasChanges"
      variant="primary"
      :loading="userIsUpdating"
      :disabled="userIsUpdating"
      data-test="submit-edit-user"
      @click="submitForm"
    >
      Save
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { useVuelidate } from '@vuelidate/core'
import { required, minLength } from '@vuelidate/validators'
import ToolTip from '@/components/ToolTip.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '../ButtonUI.vue'
import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'
import { LIST_CURRENCIES } from '@/constant'
import { useClipboard } from '@vueuse/core'
import { NETWORK } from '@/constant'
import { ref, computed, watch } from 'vue'
import UploadImage from '@/components/forms/UploadImage.vue'
import { useCustomFetch } from '@/composables'

// Currency store
const currencyStore = useCurrencyStore()
const toastStore = useToastStore()
const userStore = useUserDataStore()
const selectedCurrency = ref<string>(currencyStore.localCurrency?.code)

const userCopy = ref({
  name: userStore.name,
  address: userStore.address,
  imageUrl: userStore.imageUrl
})

// Computed property to check if name or image has changed
const hasChanges = computed(() => {
  return userCopy.value.name !== userStore.name || userCopy.value.imageUrl !== userStore.imageUrl
})

const userUpdateEndpoint = computed(() => `/users/${userStore.address}`)

const {
  isFetching: userIsUpdating,
  isFinished: userUpdateFinished,
  error: userUpdateError,
  execute: executeUpdateUser
} = useCustomFetch(userUpdateEndpoint, { immediate: false }).put(userCopy).json()

watch(userUpdateError, () => {
  if (userUpdateError.value) {
    toastStore.addErrorToast(userUpdateError.value || 'Failed to update user')
  }
})

watch(userUpdateFinished, () => {
  if (userUpdateFinished.value && !userUpdateError.value) {
    // Update user store
    toastStore.addSuccessToast('User updated successfully')
    // reload the page to reflect changes
    window.location.reload()
  }
})

const rules = {
  user: {
    name: {
      required,
      minLength: minLength(3)
    }
  }
}
const $v = useVuelidate(rules, { user: userCopy })

// Clipboard
const { copy, copied, isSupported } = useClipboard()

// Explorer
const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}

const handleCurrencyChange = () => {
  currencyStore.setCurrency(selectedCurrency.value)
  toastStore.addSuccessToast('Currency updated')
}

const submitForm = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return
  executeUpdateUser()
}
</script>
