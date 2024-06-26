<template>
  <tbody class="overflow-scroll p-10">
    <tr v-for="(row, rowIndex) in tableData" :key="rowIndex">
      <template v-for="(key, cellIndex) in Object.keys(row)" :key="cellIndex">
        <td v-if="Array.isArray(row[key])" v-for="(item, index) in row[key]" :key="index">
          {{ item }}
        </td>
        <td v-else>
          {{ row[key] }}
        </td>
      </template>
    </tr>
  </tbody>
</template>

<script setup lang="ts">
defineProps<{
  tableData: Array<any>
}>()
</script>
