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
          :selected="currencyStore.currency.code == currency.code"
          :value="currency.code"
        >
          {{ currency.code }}
        </option>
      </select>
    </label>

    <!-- Upload -->
    <div class="flex items-center gap-4">
      <div
        ref="uploadBox"
        class="w-40 h-40 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center relative overflow-hidden bg-white transition-colors duration-300"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="absolute inset-0 opacity-0 cursor-pointer z-10"
          @change="onFileChange"
        />
        <div
          ref="uploadLabel"
          class="absolute text-sm font-medium text-white bg-emerald-700 px-3 py-2 rounded z-0"
        >
          Choisir l'image
        </div>
      </div>

      <button
        @click="uploadImage"
        class="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600"
      >
        Uploader
      </button>
    </div>
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
import { ref } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, minLength } from '@vuelidate/validators'
import ToolTip from '@/components/ToolTip.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '../ButtonUI.vue'
import { LIST_CURRENCIES, useCurrencyStore } from '@/stores'
import { useClipboard } from '@vueuse/core'
import { NETWORK } from '@/constant'

// Props & emits
defineProps<{ isLoading: boolean }>()
const emits = defineEmits(['submitEditUser'])

// Currency store
const currencyStore = useCurrencyStore()
const selectedCurrency = ref<string>(currencyStore.currency.code)

// User form
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
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadBox = ref<HTMLDivElement | null>(null)
const uploadLabel = ref<HTMLDivElement | null>(null)

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  selectedFile.value = file
  const reader = new FileReader()

  reader.onload = (e: ProgressEvent<FileReader>) => {
    const result = e.target?.result
    if (typeof result === 'string' && uploadBox.value && uploadLabel.value) {
      uploadBox.value.style.backgroundImage = `url(${result})`
      uploadBox.value.style.backgroundSize = 'cover'
      uploadBox.value.style.backgroundPosition = 'center'
      uploadBox.value.classList.remove('border-gray-400')
      uploadBox.value.classList.add('border-green-500')
      uploadLabel.value.classList.add('bg-opacity-70', 'text-xs', 'px-2', 'py-1')
      uploadLabel.value.innerText = 'Image sélectionnée'
      uploadLabel.value.style.top = '5px'
      uploadLabel.value.style.left = '5px'
    }
  }

  reader.readAsDataURL(file)
}

const uploadImage = async () => {
  if (!selectedFile.value) {
    alert("Veuillez sélectionner une image d'abord.")
    return
  }

  const formData = new FormData()
  formData.append('image', selectedFile.value)

  try {
    const res = await fetch('http://localhost:3000/api/upload/upload', {
      method: 'POST',
      body: formData
    })

    const data = await res.json()
    console.log('Image URL:', data.imageUrl)
    alert('Image uploadée avec succès : ' + data.imageUrl)
  } catch (err) {
    console.error("Erreur lors de l'upload :", err)
    alert("Erreur lors de l'upload.")
  }
}
</script>
