<template>
  <tr class="cursor-pointer hover">
    <th>{{ member.name }}</th>
    <th>{{ member.address }}</th>
    <th>
      <button class="btn btn-error btn-xs" @click="emits('deleteMember', teamId, member.address)">
        Delete
      </button>
    </th>
  </tr>
</template>
<script setup lang="ts">
import type { MemberInput } from '@/types'
import { ref } from 'vue'

const emits = defineEmits(['deleteMember'])
const props = defineProps<{
  member: Partial<MemberInput>
  teamId: Number
}>()
const member = ref(props.member)
</script>
