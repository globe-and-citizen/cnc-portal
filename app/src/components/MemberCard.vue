<template>
  <div class="collapse bg-base-100 collapse-arrow">
    <input type="checkbox" />
    <div class="collapse-title text-sm font-bold flex px-4">
      <span class="w-1/2">{{ member.name }}</span>
      <span class="w-2/3">{{ member.address }}</span>
    </div>
    <div class="collapse-content">
      <div class="flex justify-center gap-2">
        <button @click="openExplorer(member.address ?? '')" class="btn btn-primary btn-xs">
          See in block explorer
        </button>
        <button @click="copy(member.address ?? '')" class="btn btn-info btn-xs">
          {{ copied ? 'Copied!' : 'Copy address' }}
        </button>
        <button
          v-if="member.address != ownerAddress && ownerAddress == useUserDataStore().address"
          class="btn btn-error btn-xs"
          @click="emits('deleteMember', member)"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import type { MemberInput } from '@/types'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { useClipboard } from '@vueuse/core'
import ToolTip from '@/components/ToolTip.vue'
import { NETWORK } from '@/constant'
import { ref } from 'vue'

const emits = defineEmits(['deleteMember'])
const props = defineProps<{
  member: Partial<MemberInput>
  teamId: Number
  ownerAddress: String
}>()
const member = ref(props.member)
const { copy, copied, isSupported } = useClipboard()

const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}
</script>
