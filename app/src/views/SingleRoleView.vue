<template>
  <main class="flex min-h-screen justify-center">
    <div class="w-full mt-10">
      <!--Hero-->
      <section class="hero-container flex justify-center bg-white border rounded-xl">
        <div class="hero-content text-center bg-white p-10 w-full bg-base-200">
          <div class="max-w-md">
            <h1 class="text-5xl font-bold">{{ data.name }}</h1>
            <p class="py-6">
              Welcome to our website. We are glad to have you here. Explore our content and enjoy
              your stay!
            </p>
            <button class="btn btn-primary mr-2" @click="handleEditCategory">Update</button>
            <button class="btn btn-active">Delete</button>
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
            <RoleTable :headings="headings" v-model="data" />

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
        v-if="showCategory"
        v-model="data"
        :is-loading="false"
        @close-modal="handleEditCategory"
      />
      <AddRoleForm v-if="showRole" @close-modal="handleAddRole" :is-single-view="true" />
    </ModalComponent>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RoleTable from '@/components/roles/RoleTable.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import AddRoleForm from '@/components/roles/AddRoleForm.vue'
import AddRoleCategoryForm from '@/components/roles/AddRoleCategoryForm.vue'

const headings = ['ID', 'Name', 'Description', 'Actions']
const showModal = ref(false)
const showCategory = ref(false)
const showRole = ref(false)

const data = ref({
  name: 'C-Suite',
  descrption: '',
  roles: [
    {
      name: 'CTO',
      description: 'Chief Trust Officer',
      entitlements: [{ type: 3, rule: '$50.00:hour', isInit: true }]
    },
    {
      name: 'CPO',
      description: 'Chief Policy Officer',
      entitlements: [{ type: 1, rule: `$4,000.00`, isInit: true }]
    },
    {
      name: 'CFO',
      description: 'Chief Financial Officer',
      entitlements: [{ type: 2, rule: `$4,500.00:yearly`, isInit: true }]
    }
  ],
  entitlements: [
    { type: 6, rule: `1` },
    { type: 2, rule: `$0.05:quarterly`, isInit: true }
  ]
})

const handleEditCategory = () => {
  showModal.value = !showModal.value
  showCategory.value = !showCategory.value
}
const handleAddRole = () => {
  showModal.value = !showModal.value
  showRole.value = !showRole.value
}
const selectedTab = ref('tab1') // Set the default selected tab here
</script>
