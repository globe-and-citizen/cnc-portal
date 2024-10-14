<template>
  <main class="flex min-h-screen justify-center">
    <div class="w-full mt-10">
      <!--Hero-->
      <section class="hero-container flex justify-center bg-white border rounded-xl">
        <div class="hero-content text-center bg-white p-10 w-full">
          <div class="max-w-md">
            <h1 class="text-5xl font-bold">{{ roleCategory?.roleCategory?.name }}</h1>
            <p class="py-6">
              {{
                roleCategory?.roleCategory?.description
                  ? roleCategory?.roleCategory?.description
                  : `A role category`
              }}
            </p>
            <button class="btn btn-primary mr-2" @click="handleEditCategory">Update</button>
            <button class="btn btn-active" @click="handleDeleteCategory">Delete</button>
          </div>
        </div>
      </section>

      <!--Tab-->
      <section class="mt-7">
        <div role="tablist" class="tabs tabs-lifted">
          <input
            type="radio"
            name="my_tabs_2"
            role="tab"
            class="tab"
            aria-label="Roles"
            v-model="selectedTab"
            value="tab1"
          />
          <div
            role="tabpanel"
            v-if="selectedTab === 'tab1'"
            class="tab-content bg-base-100 border-base-300 rounded-box p-6"
          >
            <RoleTable
              v-if="_roleCategory"
              :headings="headings"
              v-model="_roleCategory.roles"
              @reload="isReload = true"
            />

            <hr class="mt-5" />

            <div class="flex justify-end mt-7">
              <button class="btn btn-primary" @click="handleAddRole">Add New Role</button>
            </div>
          </div>

          <input
            type="radio"
            name="my_tabs_2"
            role="tab"
            class="tab"
            aria-label="Tab 2"
            v-model="selectedTab"
            value="tab2"
          />
          <div
            role="tabpanel"
            v-if="selectedTab === 'tab2'"
            class="tab-content bg-base-100 border-base-300 rounded-box p-6"
          >
            Tab content 2
          </div>

          <input
            type="radio"
            name="my_tabs_2"
            role="tab"
            class="tab"
            aria-label="Tab 3"
            v-model="selectedTab"
            value="tab3"
          />
          <div
            role="tabpanel"
            v-if="selectedTab === 'tab3'"
            class="tab-content bg-base-100 border-base-300 rounded-box p-6"
          >
            Tab content 3
          </div>
        </div>
      </section>
    </div>

    <ModalComponent v-model="showModal">
      <AddRoleCategoryForm
        v-if="showCategory && _roleCategory"
        v-model="_roleCategory"
        :is-loading="false"
        :category-id="_roleCategory?.id"
        @close-modal="handleEditCategory"
        @reload="isReload = true"
      />
      <AddRoleForm
        v-if="showRole"
        @close-modal="handleAddRole"
        @reload="isReload = true"
        v-model="initRole"
        :is-single-view="true"
        :category-id="_roleCategory?.id"
      />
    </ModalComponent>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import RoleTable from '@/components/sections/role-categories/RoleTable.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import AddRoleForm from '@/components/forms/roles/AddRoleForm.vue'
import AddRoleCategoryForm from '@/components/forms/roles/AddRoleCategoryForm.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useRoute } from 'vue-router'
import type { RoleCategory } from '@/types'

const route = useRoute()

const headings = ['ID', 'Name', 'Description', 'Actions']
const showModal = ref(false)
const showCategory = ref(false)
const showRole = ref(false)
const isReload = ref(false)

const { data: roleCategory, execute: executeFetchRoleCategory } = useCustomFetch(
  `role-category/${route.params.id}`,
  {
    immediate: false
  }
)
  .get()
  .json()

const { execute: executeDeleteRoleCategory } = useCustomFetch(`role-category/${route.params.id}`, {
  immediate: false
})
  .delete()
  .json()

const _roleCategory = ref<RoleCategory | null>(null)
const initRole = ref({
  name: '',
  description: '',
  entitlements: [
    {
      entitlementTypeId: 0,
      value: ''
    }
  ]
})

const handleDeleteCategory = async () => {
  await executeDeleteRoleCategory()
  isReload.value = true
}

const handleEditCategory = () => {
  showModal.value = !showModal.value
  showCategory.value = !showCategory.value
}
const handleAddRole = () => {
  showModal.value = !showModal.value
  showRole.value = !showRole.value
}
const selectedTab = ref('tab1') // Set the default selected tab here

//Reloads page after update
watch(isReload, async (newValue) => {
  if (newValue) {
    await executeFetchRoleCategory()
    _roleCategory.value = roleCategory.value.roleCategory
    isReload.value = false
  }
})

onMounted(async () => {
  await executeFetchRoleCategory()
  _roleCategory.value = roleCategory.value.roleCategory
})
</script>
