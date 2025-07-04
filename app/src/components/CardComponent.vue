<template>
  <div class="card bg-base-100 shadow-lg">
    <div class="card-body">
      <div class="flex justify-between items-center">
        <span class="card-title">{{ props.title }}</span>
        <div class="card-actions justify-end">
          <slot name="card-action"> </slot>
        </div>
      </div>
      <div class="card-content">
        <slot> </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    default: ''
  }
})
</script>
