<template>
  <div class="flex gap-4">
    <ToolTip
      data-test="member-address-tooltip"
      content="Click to see address in block explorer"
      @click="openExplorer(address)"
    >
      <span class="cursor-pointer underline">{{ address }}</span>
    </ToolTip>

    <ToolTip
      data-test="copy-address-tooltip"
      :content="copied ? 'Copied!' : 'Click to copy address'"
      v-if="isSupported"
    >
      <ClipboardDocumentListIcon
        class="size-5 cursor-pointer"
        @click="copy(address)"
        v-if="!copied"
      />
      <ClipboardDocumentCheckIcon v-if="copied" class="size-5" />
    </ToolTip>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { NETWORK } from '@/constant'
import ToolTip from './ToolTip.vue'
defineProps<{
  address: string
}>()

const { copy, copied, isSupported } = useClipboard()
const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}
</script>
