<template>
  <div role="tablist" class="tabs tabs-lifted overflow-x-auto">
    <a
      v-for="(tab, index) in tabs"
      :key="index"
      class="whitespace-nowrap tab"
      role="tab"
      :class="{ 'tab-active': activeTab === index }"
      @click="activeTab = index"
      >{{ tab }}
    </a>
  </div>

  <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
    <slot :name="`tab-${activeTab}`"> </slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  tabs: Array<string>
}>()
const activeTab = defineModel({ default: 0 })
</script>
