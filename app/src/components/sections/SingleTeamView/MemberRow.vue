<template>
  <tr>
    <th>{{ member.index ?? '' }}</th>
    <td>{{ member.name }}</td>
    <td>
      <div class="flex gap-4">
        <ToolTip
          data-test="member-address-tooltip"
          content="Click to see address in block explorer"
          @click="openExplorer(member.address ?? '')"
        >
          <span class="cursor-pointer underline">{{ member.address }}</span>
        </ToolTip>

        <ToolTip
          data-test="copy-address-tooltip"
          :content="copied ? 'Copied!' : 'Click to copy address'"
          v-if="isSupported"
        >
          <ClipboardDocumentListIcon
            class="size-5 cursor-pointer"
            @click="copy(member.address ?? '')"
            v-if="!copied"
          />
          <ClipboardDocumentCheckIcon v-if="copied" class="size-5" />
        </ToolTip>
      </div>
    </td>
    <td class="relative w-1/4" v-if="ownerAddress === userDataStore.address">
      <button
        v-if="member.address != ownerAddress && ownerAddress == userDataStore.address"
        class="btn btn-error btn-sm flex gap-4"
        @click="() => (showDeleteMemberConfirmModal = true)"
      >
        <TrashIcon class="size-4" />
      </button>
    </td>
    <div>
      <ModalComponent v-model="showDeleteMemberConfirmModal">
        <DeleteConfirmForm :isLoading="memberIsDeleting" @deleteItem="deleteMemberAPI">
          Are you sure you want to delete
          <span class="font-bold">{{ member.name }}</span>
          with address <span class="font-bold">{{ member.address }}</span>
          from the team?
        </DeleteConfirmForm>
      </ModalComponent>
    </div>
  </tr>
</template>
<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import DeleteConfirmForm from '@/components/forms/DeleteConfirmForm.vue'
import {
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import ToolTip from '@/components/ToolTip.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useRoute } from 'vue-router'
import type { MemberInput } from '@/types'
import { useClipboard } from '@vueuse/core'
import { NETWORK } from '@/constant'
import { ref, watch } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useCustomFetch } from '@/composables/useCustomFetch'

interface Member extends MemberInput {
  index: number
}
const props = defineProps<{
  member: Partial<Member>
  teamId: Number
  ownerAddress: String
}>()
const { addSuccessToast, addErrorToast } = useToastStore()
const { copy, copied, isSupported } = useClipboard()
const userDataStore = useUserDataStore()
const route = useRoute()

const emits = defineEmits(['getTeam'])

const member = ref(props.member)
const showDeleteMemberConfirmModal = ref(false)

// useFetch instance for deleting member
const {
  error: deleteMemberError,
  isFetching: memberIsDeleting,
  execute: deleteMemberAPI
} = useCustomFetch(`teams/${String(route.params.id)}/member`, {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    options.headers = {
      memberaddress: member.value.address ? member.value.address : '',
      'Content-Type': 'application/json',
      ...options.headers
    }
    return { options, url, cancel }
  }
})
  .delete()
  .json()
// Watchers for deleting member
watch([() => memberIsDeleting.value, () => deleteMemberError.value], async () => {
  if (!memberIsDeleting.value && !deleteMemberError.value) {
    addSuccessToast('Member deleted successfully')
    showDeleteMemberConfirmModal.value = false
    emits('getTeam')
  }
})

watch(deleteMemberError, () => {
  if (deleteMemberError.value) {
    addErrorToast(deleteMemberError.value)
    showDeleteMemberConfirmModal.value = false
  }
})

const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}
</script>
