<template>
  <div class="flex flex-col gap-5 mt-4" data-test="edit-user-modal">
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
        v-model="selectedCurrency"
        data-test="currency-select"
        class="select select-sm w-full focus:border-none focus:outline-none"
      >
        <option
          :key="currency.code"
          v-for="currency in LIST_CURRENCIES"
          :selected="currencyStore.localCurrency.code == currency.code"
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
import { useCurrencyStore } from '@/stores'
import LIST_CURRENCIES from '@/constant'
import { useClipboard } from '@vueuse/core'
import { NETWORK } from '@/constant'
import { ref } from 'vue'
import UploadImage from '@/components/forms/UploadImage.vue'

// Props & emits
defineProps<{ isLoading: boolean }>()
const emits = defineEmits(['submitEditUser'])

// Currency store
const currencyStore = useCurrencyStore()
const selectedCurrency = ref<string>(currencyStore.localCurrency.code)

// User form
const user = defineModel({
  default: {
    name: '',
    address: '',
    imageUrl: ''
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
const $v = useVuelidate(rules, { user })

// Clipboard
const { copy, copied, isSupported } = useClipboard()

// Explorer
const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}

const submitForm = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return
  currencyStore.setCurrency(selectedCurrency.value)
  emits('submitEditUser')
}

// Upload image logic
</script>
