<script setup lang="ts">
import MemberDetail from '@/components/MemberDetail.vue';
import { useMembersStore } from '@/stores/member';

const { members } = useMembersStore()
</script>

<template>
  <div class="text-primary text-center my-[20px]">My teams</div>
  <div class="flex flex-col gap-[10px] mx-[200px]">
    <div v-for="member in members" :key="member.id" class="bg-neutral p-[6px]">
      <MemberDetail :member="member" />
    </div>
  </div>
</template>
