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
      :hiddenMembers="teamMembers"
      :show-on-focus="props.showOnFocus"
      :only-team-members="props.onlyTeamMembers"
      :disable-team-members="props.disableTeamMembers"
      :hidden-members-message="props.hiddenMembersMessage"
    />
  </div>
</template>

<script lang="ts" setup>
import UserComponent from '@/components/UserComponent.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { ref } from 'vue'
import type { User } from '@/types'

interface Props {
  showOnFocus?: boolean
  filterByTeam?: boolean
  isCreatingTeam?: boolean // True when creating a new team, false when adding members to existing team
  onlyTeamMembers?: boolean
  disableTeamMembers?: boolean
  hiddenMembersMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  showOnFocus: false,
  filterByTeam: false,
  isCreatingTeam: false,
  onlyTeamMembers: false,
  disableTeamMembers: false,
  hiddenMembersMessage: 'Already in your team'
})

const input = ref('')

const teamMembers = defineModel<Array<User>>({
  required: true,
  default: []
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
