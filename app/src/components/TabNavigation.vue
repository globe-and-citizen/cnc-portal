<template>
  <div role="tablist" class="tabs tabs-lifted">
    <template v-for="(tab, index) in tabs" :key="index">
      <a
        role="tab"
        class="tab"
        :class="{ 'tab-active': index === activeTab }"
        :aria-label="tab"
        @click="activeTab = index"
      >
        {{ tab }}</a
      >
      <div
        role="tabpanel"
        class="tab-content bg-base-100 border-base-300 rounded-box p-6 overflow-hidden"
      >
        <slot :name="`tab-${index}`"> </slot>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  tabs: Array<string>
}>()
const activeTab = defineModel({ default: 0 })
</script>
