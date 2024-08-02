<template>
  <div class="flex flex-col items-center">
    <img src="../../../assets/login-illustration.png" alt="Login illustration" width="300" />

    <span class="font-bold text-sm text-gray-500 my-4"
      >There are currently no roles your team, {{ useUserDataStore().name }}. Create a new role
      now!</span
    >

    <div class="flex justify-center">
      <AddResourceCard
        text="Add Role Category"
        @open-add-resource-modal="showAddRoleCategoryModal = !showAddRoleCategoryModal"
        class="w-72 h-16 text-sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import AddResourceCard from '@/components/AddResourceCard.vue'
import { useUserDataStore } from '@/stores/user'
const showAddRoleCategoryModal = defineModel<boolean>('showAddRoleCategoryModal')
</script>
