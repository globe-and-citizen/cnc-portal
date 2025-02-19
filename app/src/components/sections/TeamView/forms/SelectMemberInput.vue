<template>
  <div class="flex flex-col gap-4" data-test="members-list">
    <div class="flex items-center" v-for="(member, index) of teamMembers" :key="index">
      <UserComponent
        class="bg-base-200 p-4 flex-grow"
        :user="{ name: member.name, address: member.address }"
      />
      <div>
        <ButtonUI variant="error" class="mt-4" size="sm" @click="removeMember(index)"> - </ButtonUI>
      </div>
    </div>
  </div>
  <div class="input-group relative" ref="formRef" data-test="member-input">
    <label
      class="input input-bordered flex items-center gap-2 input-md"
      :data-test="`member-input`"
    >
      <input
        type="text"
        class="w-24"
        v-model="input.name"
        @keyup.stop="searchUsers({ name: input.name, address: '' })"
        :placeholder="'Member Name '"
        :data-test="`member-name-input`"
      />
      |
      <input
        type="text"
        class="grow"
        v-model="input.address"
        @keyup.stop="searchUsers({ name: '', address: input.address })"
        :data-test="`member-address-input`"
        :placeholder="`Member Address`"
      />
    </label>
    <!-- Dropdown positioned relative to the input -->
    <div
      v-if="showDropdown && users?.users && users?.users.length > 0"
      class="absolute left-0 top-full mt-1 w-full z-10"
    >
      <ul class="p-2 shadow menu dropdown-content bg-base-100 rounded-box w-full">
        <li v-for="user in users.users" :key="user.address">
          <a
            :data-test="`user-dropdown-${user.address}`"
            @click="
              () => {
                addMember(user)
                showDropdown = false
              }
            "
          >
            {{ user.name }} | {{ user.address }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import UserComponent from '@/components/UserComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'

const teamMembers = defineModel({
  type: Array<{
    name: string
    address: string
    id?: string | undefined
  }>,
  required: true,
  default: []
})
const input = ref({ name: '', address: '' })
const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const url = ref('user/search')
const { execute: executeSearchUser, data: users } = useCustomFetch(url, { immediate: false })
  .get()
  .json()

const searchUsers = async (input: { name: string; address: string }) => {
  if (input.address == '' && input.name) {
    url.value = 'user/search?name=' + input.name
  } else if (input.name == '' && input.address) {
    url.value = 'user/search?address=' + input.address
  }
  await executeSearchUser()
  showDropdown.value = true
}

const addMember = (member: { name: string; address: string }) => {
  if (!teamMembers.value.find((m) => m.address === member.address)) {
    teamMembers.value.push(member)
  }
}

const removeMember = (id: number) => {
  teamMembers.value.splice(id, 1)
}
</script>
