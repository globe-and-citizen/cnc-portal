<template>
    <div
      class="card h-36 w-80 border"
      :class="`${roleCategory.creator == useUserDataStore().address ? 'bg-green-100' : 'bg-blue-100'}`"
    >
      <div class="card-body">
        <div class="flex flex-row justify-between items-start">
          <h1 class="card-title text-md overflow-hidden">
            {{ props.roleCategory.name }}
          </h1>
          <div
            class="badge badge-sm badge-primary"
            v-if="roleCategory.creator == useUserDataStore().address"
          >
            Owner
          </div>
          <div class="badge badge-sm badge-secondary" v-else>Employee</div>
        </div>
        <div>
          <p class="text-xs line-clamp-3">{{ props.roleCategory.description }}</p>
        </div>
        <div class="card-actions justify-between"></div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { useUserDataStore } from '@/stores/user'
  //import type { Team } from '@/types'
  
  type RoleCategory = {id: number, name: string, description?: string, creator: string}
  type Props = {roleCategory: RoleCategory}

  const props = defineProps<Props>()
  </script>
  