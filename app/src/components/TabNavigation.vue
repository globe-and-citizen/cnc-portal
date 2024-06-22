<template>
  <div role="tablist" class="tabs tabs-boxed">
    <a
      v-for="tab in tabs"
      :key="tab"
      role="tab"
      class="tab bg-white border shadow-sm !rounded-none"
      :class="{ 'tab-active': activeTab === tab }"
      @click="$emit('setTab', tab)"
      >{{ tab }}</a
    >
  </div>
</template>

<script setup lang="ts">
defineEmits(['setTab'])
defineProps<{
  activeTab: string
  tabs: Array<any>
}>()
</script>
