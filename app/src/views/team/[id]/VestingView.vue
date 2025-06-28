<template>
  <VestingStats :reloadKey="reloadKey" />

  <VestingFlow @reload="triggerReload" :reloadKey="reloadKey" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import VestingStats from '@/components/sections/VestingView/VestingStats.vue'
const reloadKey = ref(0)

const triggerReload = () => {
  reloadKey.value++
}
</script>
