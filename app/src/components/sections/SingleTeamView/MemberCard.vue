<template>
  <div class="collapse bg-base-100 collapse-arrow">
    <input type="checkbox" />
    <div class="collapse-title text-sm font-bold flex px-4">
      <span class="w-1/2">{{ member.name }}</span>
      <span class="w-2/3">{{ member.address }}</span>
    </div>
    <div class="collapse-content">
      <div class="flex justify-center gap-2">
        <ButtonUI
          @click="openExplorer(member.address ?? '')"
          variant="primary"
          size="xs"
          data-test="show-address-button"
        >
          See in block explorer
        </ButtonUI>
        <ButtonUI
          v-if="isSupported"
          @click="copy(member.address ?? '')"
          variant="info"
          size="xs"         
          data-test="copy-address-button"
        >
          {{ copied ? 'Copied!' : 'Copy address' }}
        </ButtonUI>
        <ButtonUI
          v-if="member.address != ownerAddress && ownerAddress == useUserDataStore().address"
          variant="error"
          size="xs"   
          data-test="delete-member-button"
          @click="() => (showDeleteMemberConfirmModal = true)"
        >
          Delete
        </ButtonUI>
      </div>
    </div>
    <ModalComponent v-model="showDeleteMemberConfirmModal">
      <DeleteConfirmForm :isLoading="memberIsDeleting" @deleteItem="deleteMemberAPI">
        Are you sure you want to delete
        <span class="font-bold">{{ memberToBeDeleted.name }}</span>
        with address <span class="font-bold">{{ memberToBeDeleted.address }}</span>
        from the team?
      </DeleteConfirmForm>
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import DeleteConfirmForm from '@/components/forms/DeleteConfirmForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useRoute } from 'vue-router'
import type { MemberInput } from '@/types'
import { useClipboard } from '@vueuse/core'
import { NETWORK } from '@/constant'
import { ref, watch } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useCustomFetch } from '@/composables/useCustomFetch'
import ButtonUI from '@/components/ButtonUI.vue'

const props = defineProps<{
  member: Partial<MemberInput>
  teamId: Number
  ownerAddress: String
}>()
const { addSuccessToast, addErrorToast } = useToastStore()

const emits = defineEmits(['getTeam'])

const route = useRoute()

const memberToBeDeleted = ref({ name: '', address: '', id: '' })
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
const member = ref(props.member)
const { copy, copied, isSupported } = useClipboard()

const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}
</script>
