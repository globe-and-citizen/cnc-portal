<template>
  <div id="admins-table" class="overflow-x-auto">
    <table class="table w-full">
      <!-- head -->
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(data, index) in datas" :key="index" class="hover:bg-base-200">
          <th>{{ index + 1 }}</th>
          <td>{{ data['key'] }}</td>
          <td>{{ data['value'] }}</td>
          <!-- <td>
              <button @click="removeAdmin(data["key"])" class="btn btn-error btn-xs">Remove</button>
            </td> -->
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

defineProps<{
  datas: Array<{ key: string; value: string }>
}>()
</script>

<style scoped>
/* Add any custom styles if necessary */
</style>
