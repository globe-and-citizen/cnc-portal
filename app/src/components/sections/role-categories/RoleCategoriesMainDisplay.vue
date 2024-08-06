<template>
  <div class="pt-10">
    <div v-if="_roleCategories?.roleCategories.length != 0">
      <RoleCategoriesCardsDisplay
        v-model:_role-categories="_roleCategories"
        v-model:show-add-role-category-modal="showAddRoleCategoryModal"
      />
    </div>
    <div v-else>
      <NoRoleCategoriesDisplay v-model:show-add-role-category-modal="showAddRoleCategoryModal" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RoleCategoryResponse } from '@/types'
import RoleCategoriesCardsDisplay from './RoleCategoriesCardsDisplay.vue'
import NoRoleCategoriesDisplay from './NoRoleCategoriesDisplay.vue'

const showAddRoleCategoryModal = defineModel<boolean>('showAddRoleCategoryModal')
const _roleCategories = defineModel<RoleCategoryResponse>('_roleCategories')
//const isRoleCategoriesFetching = defineModel<boolean>("isRoleCategoriesFetching")
</script>
