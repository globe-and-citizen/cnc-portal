<template>
  <div id="admins-table" class="overflow-x-auto">
    <table class="table w-full">
      <!-- head -->
      <thead>
        <tr>
          <th>#</th>
          <th>Admin Address</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(admin, index) in admins" :key="index" class="hover:bg-base-200">
          <th>{{ index + 1 }}</th>
          <td>{{ admin }}</td>
          <td>
            <button @click="removeAdmin(admin)" class="btn btn-error btn-xs">Remove</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

defineProps<{
  admins: string[]
}>()

//const emit = defineEmits(['removeAdmin']);

function removeAdmin(admin: string) {
  console.log('remove admin', admin)
}
</script>

<style scoped>
/* Add any custom styles if necessary */
</style>
