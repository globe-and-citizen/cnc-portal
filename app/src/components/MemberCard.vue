<template>
  <div
    class="collapse bg-base-100"
    :class="`${member.address != ownerAddress && ownerAddress == useUserDataStore().address ? 'collapse-arrow' : ''}`"
  >
    <input
      type="checkbox"
      v-if="member.address != ownerAddress && ownerAddress == useUserDataStore().address"
    />
    <div class="collapse-title text-sm font-bold flex px-4">
      <span class="w-1/2">{{ member.name }}</span>
      <span class="w-2/3">{{ member.address }}</span>
    </div>
    <div class="collapse-content">
      <div class="flex justify-center">
        <button
          v-if="member.address != ownerAddress && ownerAddress == useUserDataStore().address"
          class="btn btn-error btn-xs"
          @click="emits('deleteMember', member)"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import type { MemberInput } from '@/types'
import { ref } from 'vue'

const emits = defineEmits(['deleteMember'])
const props = defineProps<{
  member: Partial<MemberInput>
  teamId: Number
  ownerAddress: String
}>()
const member = ref(props.member)
</script>
