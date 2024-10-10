<template>
  <div class="collapse bg-base-100 collapse-arrow">
    <input type="checkbox" />
    <div class="collapse-title text-sm font-bold flex px-4">
      <span class="w-1/2">{{ member.name }}</span>
      <span class="w-2/3">{{ member.address }}</span>
    </div>
    <div class="collapse-content">
      <div class="flex justify-center gap-2">
        <button
          @click="openExplorer(member.address ?? '')"
          class="btn btn-primary btn-xs"
          data-test="show-address-button"
        >
          See in block explorer
        </button>
        <button
          v-if="isSupported"
          @click="copy(member.address ?? '')"
          class="btn btn-info btn-xs"
          data-test="copy-address-button"
        >
          {{ copied ? 'Copied!' : 'Copy address' }}
        </button>
        <!--Add/Edit User Roles-->
        <button
          @click="showAddEditMemberRoles = !showAddEditMemberRoles"
          class="btn btn-active btn-xs"
        >
          Add Roles
        </button>
        <button
          v-if="member.address != ownerAddress && ownerAddress == useUserDataStore().address"
          class="btn btn-error btn-xs"
          data-test="delete-member-button"
          @click="() => (showDeleteMemberConfirmModal = true)"
        >
          Delete
        </button>
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
    <ModalComponent v-if="roleCategories" v-model="showAddEditMemberRoles">
      <AddMemberRolesForm
        :role-categories="roleCategories"
        :is-adding-role="isAddingRole"
        v-model="member.roles"
        @add-roles="emits('addRoles')"
        @close-modal="showAddEditMemberRoles = !showAddEditMemberRoles"
      />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import DeleteConfirmForm from '@/components/forms/DeleteConfirmForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useRoute } from 'vue-router'
import type { MemberInput, RoleCategory, Role } from '@/types'
import { useClipboard } from '@vueuse/core'
import { NETWORK } from '@/constant'
import { ref, watch, onMounted } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useCustomFetch } from '@/composables/useCustomFetch'
import AddMemberRolesForm from '@/components/sections/SingleTeamView/forms/AddMemberRolesForm.vue'
import { useVuelidate } from "@vuelidate/core";

const props = defineProps<{
  isAddingRole: boolean
  member: Partial<MemberInput>
  teamId: Number
  ownerAddress: String
}>()
const { addSuccessToast, addErrorToast } = useToastStore()

const emits = defineEmits(['getTeam', 'addRoles'])

const route = useRoute()

useVuelidate()

const memberToBeDeleted = ref({ name: '', address: '', id: '' })
const showDeleteMemberConfirmModal = ref(false)
const showAddEditMemberRoles = ref(false)
const roleCategories = ref<null | RoleCategory[]>(null)

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

// useFetch fetch role categories
const {
  execute: executeFetchRoleCategories,
  data: _roleCategories
} = useCustomFetch('role-category', {
  immediate: false
})
  .get()
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

onMounted(async () => {
 await executeFetchRoleCategories()
 roleCategories.value = _roleCategories.value.roleCategories
})
</script>
