<template>
  <thead>
    <tr>
      <th v-for="(column, index) in columns" :key="index">
        {{ column }}
      </th>
    </tr>
  </thead>
</template>

<script setup lang="ts">
defineProps<{
  columns: Array<string>
}>()
</script>
