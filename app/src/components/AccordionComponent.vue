<template>
  <template v-for="(accordion, index) in accordions" :key="index">
    <div class="collapse collapse-arrow bg-base-200">
      <input type="radio" :name="`accordion-${index}`" :checked="activeAccordion == index" />
      <div class="collapse-title text-xl font-medium">{{ accordion }}</div>
      <div class="collapse-content">
        <slot :name="`accordion-${index}`"></slot>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
defineProps<{
  accordions: Array<string>
}>()
const activeAccordion = defineModel({
  default: 0
})
</script>
