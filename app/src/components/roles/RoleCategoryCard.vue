<template>
  <div
    class="card h-36 w-80 border bg-green-100"
  >
    <div class="card-body">
      <div class="flex flex-row justify-between items-start">
        <h1 class="card-title text-md overflow-hidden">
          {{ props.roleCategory.name }}
        </h1>
      </div>
      <div>
        <p class="text-xs line-clamp-3">{{ props.roleCategory.description }}</p>
      </div>
      <div class="card-actions justify-between"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RoleCategory } from '@/types'

type Props = { roleCategory: RoleCategory }

const props = defineProps<Props>()
</script>
