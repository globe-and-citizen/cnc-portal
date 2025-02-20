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
    <SelectMemberInput v-model="input" @selectMember="addMember"></SelectMemberInput>
  </div>
</template>

<script lang="ts" setup>
import UserComponent from '@/components/UserComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import SelectMemberInput from './SelectMemberInput.vue'
import { ref } from 'vue'

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
