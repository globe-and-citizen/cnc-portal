<template>
  <div class="flex flex-col gap-5 mt-4 overflow-hidden" data-test="edit-user-modal">
    <!-- Input Name -->
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-24" data-test="name-label">Name</span>
      <input
        type="text"
        class="grow"
        data-test="name-input"
        placeholder="John Doe"
        v-model="user.name"
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

    <!-- Wallet Address -->
    <label class="input input-bordered flex items-center gap-2 input-md input-disabled">
      <span class="w-24 text-xs" data-test="address-label">Wallet Address</span>
      <ToolTip data-test="address-tooltip" content="Click to see address in block explorer">
        <div
          type="text"
          class="w-full cursor-pointer"
          @click="openExplorer(user.address)"
          data-test="user-address"
          readonly
        >
          {{ user.address }}
        </div>
      </ToolTip>
      <ToolTip
        data-test="copy-address-tooltip"
        :content="copied ? 'Copied!' : 'Click to copy address'"
      >
        <IconifyIcon
          v-if="isSupported && !copied"
          data-test="copy-address-icon"
          class="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          @click="copy(user.address)"
          icon="heroicons:clipboard-document"
        />
        <IconifyIcon
          v-if="copied"
          data-test="copied-icon"
          class="w-5 h-5 text-emerald-500"
          icon="heroicons:check"
        />
      </ToolTip>
    </label>

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
      :model-value="user.imageUrl"
      @update:model-value="($event) => (user.imageUrl = $event)"
    />
  </div>
  <div class="modal-action justify-center">
    <ButtonUI
      v-if="hasChanges"
      variant="primary"
      :loading="isLoading"
      :disabled="isLoading"
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
import { useCurrencyStore, useToastStore } from '@/stores'
import { LIST_CURRENCIES } from '@/constant'
import { useClipboard } from '@vueuse/core'
import { NETWORK } from '@/constant'
import { ref, computed, watch } from 'vue'
import UploadImage from '@/components/forms/UploadImage.vue'

// Props & emits
defineProps<{ isLoading: boolean }>()
const emits = defineEmits(['submitEditUser'])

// Currency store
const currencyStore = useCurrencyStore()
const toastStore = useToastStore()
const selectedCurrency = ref<string>(currencyStore.localCurrency?.code)

// User form
const user = defineModel({
  default: {
    name: '',
    address: '',
    imageUrl: ''
  }
})

// Track initial values
const initialValues = ref({
  name: user.value.name,
  imageUrl: user.value.imageUrl
})

watch(
  () => user.value,
  (newUser) => {
    if (initialValues.value.name === '') {
      initialValues.value = {
        name: newUser.name,
        imageUrl: newUser.imageUrl
      }
    }
  },
  { deep: true, immediate: true }
)

// Computed property to check if name or image has changed
const hasChanges = computed(() => {
  return (
    user.value.name !== initialValues.value.name ||
    user.value.imageUrl !== initialValues.value.imageUrl
  )
})

const rules = {
  user: {
    name: {
      required,
      minLength: minLength(3)
    }
  }
}
const $v = useVuelidate(rules, { user })

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
  emits('submitEditUser')
}
</script>
