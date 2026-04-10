<template>
  <div v-if="members.length > 0">
    <div class="pb-1 text-xs text-gray-500 uppercase">Team Members</div>
    <div class="grid grid-cols-2 gap-4 pb-3" data-test="user-search-results">
      <div
        v-for="member in members"
        :key="member.address"
        class="group relative flex cursor-pointer items-center"
        data-test="user-row"
        @click="handleSelect(member)"
      >
        <UserComponent
          class="hover:bg-base-300 flex-grow rounded-lg bg-white p-4"
          :user="member"
          :data-test="`user-dropdown-${member.address}`"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { toRef } from 'vue'
import UserComponent from '@/components/UserComponent.vue'
import type { Member } from '@/types'

const props = defineProps<{
  members: Member[]
}>()

const emit = defineEmits<{
  select: [member: Member]
}>()

const members = toRef(props, 'members')

const handleSelect = (member: Member) => {
  emit('select', member)
}
</script>
