<template>
  <div v-if="members.length > 0">
    <div class="px-2 pt-3 pb-1 text-xs uppercase text-gray-500">Team Members</div>
    <div class="grid grid-cols-2 gap-4 px-2 pb-3" data-test="user-search-results">
      <div
        v-for="member in members"
        :key="member.address"
        class="flex items-center relative group cursor-pointer"
        data-test="user-row"
        @click="handleSelect(member)"
      >
        <UserComponent
          class="p-4 flex-grow rounded-lg bg-white hover:bg-base-300"
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
