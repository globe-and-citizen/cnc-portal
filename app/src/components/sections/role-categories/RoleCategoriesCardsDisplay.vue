<template>
  <div
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20"
  >
    <RoleCategoryCard
      v-for="roleCategory in _roleCategories?.roleCategories"
      :key="roleCategory.id"
      :role-category="roleCategory"
      class="cursor-pointer"
      @click="navigateToRole(roleCategory.id)"
    />
    <div class="flex justify-center">
      <AddResourceCard
        @open-add-resource-modal="showAddRoleCategoryModal = !showAddRoleCategoryModal"
        class="w-80 text-xl"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import AddResourceCard from "@/components/AddResourceCard.vue"
import RoleCategoryCard from "@/components/sections/role-categories/RoleCategoryCard.vue"
import type { RoleCategoryResponse } from "@/types";
import { useRouter } from "vue-router"

const _roleCategories = defineModel<RoleCategoryResponse>("_roleCategories")
const showAddRoleCategoryModal = defineModel<boolean>("showAddRoleCategoryModal")

const router = useRouter()

function navigateToRole(id: number | undefined) {
  if (id) router.push('/roles/' + id)
}
</script>