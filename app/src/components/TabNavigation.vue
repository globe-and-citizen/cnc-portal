<template>
  <div role="tablist" class="tabs tabs-lifted">
    <template v-for="(tab, index) in tabs">
      <input
        type="radio"
        role="tab"
        class="tab"
        :aria-label="tab"
        :checked="index === activeTab"
        @change="activeTab = index"
      />
      <div
        role="tabpanel"
        class="tab-content bg-base-100 border-base-300 rounded-box p-6"
      >
        <slot :name="`tab-${index}`"> </slot>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  tabs: Array<string>
  initialActiveTab?: number
}>()
const activeTab = ref(props.initialActiveTab ?? 0)
</script>
