<template>
  <div role="tablist" class="tabs tabs-lifted">
    <template v-for="(tab, index) in tabs" :key="index">
      <input
        type="radio"
        role="tab"
        class="tab"
        :aria-label="tab"
        :checked="activeTab === index"
        @change="activeTab = index"
      />
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
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
