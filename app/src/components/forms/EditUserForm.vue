<template>
  <div class="flex flex-col gap-5 mt-4">
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-24">Name</span>
      <input type="text" class="grow" placeholder="John Doe" v-model="user.name" />
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md input-disabled">
      <span class="w-24 text-xs">Wallet Address</span>
      <ToolTip content="Click to see address in block explorer">
        <div type="text" class="w-full cursor-pointer" @click="openExplorer(user.address)" readonly>
          {{ user.address }}
        </div>
      </ToolTip>
      <ClipboardDocumentListIcon
        v-if="isSupported && !copied"
        class="size-5 cursor-pointer"
        @click="copy(user.address)"
      />
      <ClipboardDocumentCheckIcon class="size-5" v-if="copied" />
    </label>
  </div>
  <div class="modal-action justify-center">
    <LoadingButton v-if="isLoading" color="primary min-w-24" />
    <button v-else class="btn btn-primary" @click="emits('submitEditUser')">Save</button>
  </div>
</template>

<script setup lang="ts">
import { NETWORK } from '@/constant'
import LoadingButton from '../LoadingButton.vue'
import ToolTip from '@/components/ToolTip.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { useClipboard } from '@vueuse/core'
const user = defineModel({
  default: {
    name: '',
    address: ''
  }
})

defineProps<{
  isLoading: boolean
}>()
const emits = defineEmits(['submitEditUser'])

const { copy, copied, isSupported } = useClipboard()

const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}
</script>

<style scoped></style>
