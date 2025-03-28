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
        <ClipboardDocumentListIcon
          v-if="isSupported && !copied"
          data-test="copy-address-icon"
          class="size-5 cursor-pointer"
          @click="copy(user.address)"
        />
        <ClipboardDocumentCheckIcon class="size-5" v-if="copied" />
      </ToolTip>
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-40" data-test="currency-label">Default Currency</span>
      <select
        class="select select-sm w-full focus:border-none focus:outline-none"
        @change="
          (e) => {
            selectedCurrency = (e.target as HTMLSelectElement)?.value
          }
        "
      >
        <option
          :key="currency"
          v-for="currency in LIST_CURRENCIES"
          :selected="currencyStore.currency == currency"
          :value="currency"
        >
          {{ currency }}
        </option>
      </select>
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
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { required, minLength } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import { useClipboard } from '@vueuse/core'
import ButtonUI from '../ButtonUI.vue'
import { LIST_CURRENCIES, useCurrencyStore } from '@/stores/currencyStore'
import { ref } from 'vue'

const currencyStore = useCurrencyStore()
const selectedCurrency = ref<string>(currencyStore.currency)

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
</script>

<style scoped></style>
