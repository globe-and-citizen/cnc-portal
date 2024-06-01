<template>
  <tr @click="emits('toggleUpdateMemberModal', member)" class="cursor-pointer hover">
    <th>{{ member.name }}</th>
    <th>{{ member.address }}</th>
    <th></th>
  </tr>
</template>
<script setup lang="ts">
import type { MemberInput } from '@/types'
import { ref } from 'vue'

const emits = defineEmits(['toggleUpdateMemberModal', 'deleteMember'])
const props = defineProps<{
  showUpdateMemberModal: boolean
  member: Partial<MemberInput>
}>()
const member = ref(props.member)
</script>
