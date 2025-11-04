<template>
  <div class="text-xm text-gray-900" v-if="teamMembers.length > 0">Click to Remove a Member</div>
  <div class="grid grid-cols-2 gap-4" data-test="members-list">
    <div class="flex items-center" v-for="member of teamMembers" :key="member.address">
      <UserComponent
        class="bg-base-200 rounded-lg p-4 flex-grow hover:cursor-pointer"
        :user="member"
        @click="addMember(member)"
      />
    </div>
    <SelectMemberInput
      v-model="input"
      @selectMember="addMember"
      class="col-span-2"
      :exclude-addresses="excludeAddresses"
    />
  </div>
</template>

<script lang="ts" setup>
import UserComponent from '@/components/UserComponent.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { ref, computed } from 'vue'
import type { User } from '@/types'

const input = ref('')

const teamMembers = defineModel<Array<User>>({
  required: true,
  default: []
})

// Exclude only addresses already selected above
const excludeAddresses = computed<string[]>(() => {
  const selected = teamMembers.value ?? []
  const addresses = selected.map((m) => m.address).filter((a): a is string => !!a)
  return Array.from(new Set(addresses))
})

const addMember = (member: User) => {
  if (!member?.address) return
  const idx = teamMembers.value.findIndex((m) => m.address === member.address)
  if (idx === -1) {
    // Add to top
    teamMembers.value.unshift(member)
  } else {
    // Remove
    teamMembers.value.splice(idx, 1)
  }
  input.value = ''
}
</script>
