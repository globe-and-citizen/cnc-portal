<template>
  <div class="grid grid-cols-2 gap-4" data-test="members-list">
    <div class="flex items-center" v-for="(member, index) of teamMembers" :key="index">
      <UserComponent
        class="bg-base-200 rounded-lg p-4 flex-grow hover:cursor-pointer"
        :user="member"
        @click="removeMember(index)"
      />
      <!-- <div>
        <ButtonUI variant="error" class="mt-4" size="sm" @click="removeMember(index)"> - </ButtonUI>
      </div> -->
    </div>
    <SelectMemberInput v-model="input" @selectMember="addMember" class="col-span-2" />
  </div>
</template>

<script lang="ts" setup>
import UserComponent from '@/components/UserComponent.vue'
// import ButtonUI from '@/components/ButtonUI.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { ref } from 'vue'
import type { User } from '@/types'
const teamMembers = defineModel<Array<Pick<User, 'address' | 'name'>>>({
  required: true,
  default: []
})

const input = ref({ name: '', address: '' })

const addMember = (member: { name: string; address: string }) => {
  if (!teamMembers.value.find((m) => m.address === member.address)) {
    teamMembers.value.push(member)
  }
  input.value = { name: '', address: '' }
}
const removeMember = (id: number) => {
  teamMembers.value.splice(id, 1)
}
</script>
