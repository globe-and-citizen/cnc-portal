<template>
  <div class="flex flex-col gap-5 mt-4" data-test="edit-user-modal">
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
          :selected="currencyStore.currency.code == currency.code"
          :value="currency.code"
        >
          {{ currency.code }}
        </option>
      </select>
    </label>

    <label for="">
      <input type="file" class="file-input file-input-bordered w-full max-w-xs" />
    </label>
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
import { NETWORK } from '@/constant'
import ToolTip from '@/components/ToolTip.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { required, minLength } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import { useClipboard } from '@vueuse/core'
import ButtonUI from '../ButtonUI.vue'
import { ref } from 'vue'
import { LIST_CURRENCIES, useCurrencyStore } from '@/stores'
//import { useDropZone } from '@vueuse/core'

const currencyStore = useCurrencyStore()
const selectedCurrency = ref<string>(currencyStore.currency.code)

// Define the user model and validation rules
const user = defineModel({
  default: {
    name: '',
    address: ''
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

defineProps<{
  isLoading: boolean
}>()

const emits = defineEmits(['submitEditUser'])

const { copy, copied, isSupported } = useClipboard()

const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}

const submitForm = () => {
  $v.value.$touch()
  if ($v.value.$invalid) {
    return
  }
  currencyStore.setCurrency(selectedCurrency.value)
  emits('submitEditUser')
}
//image state

</script>

<style scoped></style>
