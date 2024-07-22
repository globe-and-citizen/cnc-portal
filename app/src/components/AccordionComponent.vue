<template>
  <template v-for="(accordion, index) in accordions" :key="index">
    <div class="collapse collapse-arrow bg-base-200">
      <input
        type="radio"
        :data-test="`accordion-radio-${index}`"
        :name="`accordion-${index}`"
        :checked="activeAccordion === index"
        @click="activeAccordion = index"
      />
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
  type: Number,
  required: true
})
</script>
