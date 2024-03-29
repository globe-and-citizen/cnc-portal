<template>
  <div className="card bg-white shadow-xl flex flex-row justify-between h-20 w-full">
    <div className="card-body flex flex-col justify-center">
      <p class="text-primary-content">{{ member.name }}</p>
      <p class="text-primary-content">{{ member.address }}</p>
      <p>{{ ethers.formatEther(balance) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Member } from '@/stores/member'
import { ethers } from 'ethers'
import { useTipsStore } from '@/stores/tips'
import { ref } from 'vue';

const { provider } = useTipsStore();
const balance = ref(BigInt(0));
const props = defineProps<{ member: Member }>();

const getBalance = async () => {
  balance.value = await provider.getBalance(props.member.address)
};
getBalance();
</script>
