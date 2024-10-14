<template>
  <div class="min-h-screen flex flex-col items-center">
    <div>
      <h2 class="pt-10">Role Categories</h2>
    </div>

    <div v-if="isRoleCategoriesFetching" class="loading loading-spinner loading-lg"></div>

    <RoleCategoriesMainDisplay
      v-if="!isRoleCategoriesFetching && _roleCategories?.roleCategories"
      v-model:_role-categories="_roleCategories"
      v-model:show-add-role-category-modal="showAddRoleCategoryModal"
    />

    <!--Error Display-->
    <RoleCategoriesErrorDisplay v-if="roleCategoryError" />

    <!--Modal-->
    <ModalComponent v-model="showAddRoleCategoryModal">
      <AddRoleCategoryForm
        :is-loading="false"
        :is-new="true"
        v-model="roleCategory"
        @close-modal="handleCloseModal"
        @create-role-category="isFetch = !isFetch"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import RoleCategoriesMainDisplay from '@/components/sections/role-categories/RoleCategoriesMainDisplay.vue'
import RoleCategoriesErrorDisplay from '@/components/sections/role-categories/RoleCategoriesErrorDisplay.vue'
import AddRoleCategoryForm from '@/components/forms/roles/AddRoleCategoryForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { RoleCategoryResponse } from '@/types'
import { deepClone } from '@/utils'

const isRoleCategoriesFetching = ref(false)
const isFetch = ref(false)
const showAddRoleCategoryModal = ref(false)

const initRoleCategory = {
  name: '',
  description: '',
  roles: [
    {
      name: '',
      description: '',
      entitlements: [
        {
          entitlementTypeId: 0,
          value: ''
        }
      ]
    }
  ],
  entitlements: [
    {
      entitlementTypeId: 0,
      value: ''
    }
  ]
}

const roleCategory = ref(deepClone(initRoleCategory))

const {
  error: roleCategoryError,
  data: _roleCategories,
  execute: executeFetchRoleCategories
} = useCustomFetch<RoleCategoryResponse>('role-category', {
  immediate: false
})
  .get()
  .json()

const handleCloseModal = () => {
  showAddRoleCategoryModal.value = !showAddRoleCategoryModal.value
  resetRoleCategoryRef()
  console.log('initRoleCategory: ', initRoleCategory)
}

const resetRoleCategoryRef = () => {
  roleCategory.value = deepClone(initRoleCategory)
}

watch(isFetch, async (newValue) => {
  if (newValue) {
    await executeFetchRoleCategories()
    resetRoleCategoryRef()
    showAddRoleCategoryModal.value = false
    isFetch.value = false
  }
})

onMounted(async () => {
  await executeFetchRoleCategories()
})
</script>

<style scoped></style>
