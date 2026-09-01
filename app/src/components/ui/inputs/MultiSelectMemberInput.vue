<template>
  <div class="mb-1 flex items-center gap-2" v-if="teamMembers.length > 0">
    <span class="text-sm text-gray-500">Click a member below to remove them</span>
    <UBadge color="primary" variant="soft">{{ teamMembers.length }} selected</UBadge>
  </div>
  <div class="grid grid-cols-2 gap-4" data-test="members-list">
    <div class="flex items-center" v-for="member of teamMembers" :key="member.address">
      <UserIdentity
        class="bg-muted grow rounded-lg p-4 hover:cursor-pointer"
        :user="member"
        @click="addMember(member)"
      />
    </div>
    <SelectMemberInput
      v-model="input"
      @selectMember="addMember"
      class="col-span-2"
      :hiddenMembers="teamMembers"
      :member-scope="props.memberScope"
      :show-on-focus="props.showOnFocus"
      :current-safe-owners="props.currentSafeOwners"
    />
  </div>
</template>

<script lang="ts" setup>
import UserIdentity from '@/components/ui/UserIdentity.vue'
import SelectMemberInput from '@/components/ui/inputs/SelectMemberInput.vue'
import { ref } from 'vue'
import type { MemberSelectionScope, User } from '@/types'

interface Props {
  showOnFocus?: boolean
  memberScope?: MemberSelectionScope
  currentSafeOwners?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  showOnFocus: false,
  memberScope: 'all-users',
  currentSafeOwners: () => []
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
