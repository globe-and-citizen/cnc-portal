<template>
  <div class="min-h-screen flex flex-col items-center">
    <div>
      <h2 class="pt-10">Role Categories</h2>
    </div>

    <div v-if="isRoleCategoriesFetching" class="loading loading-spinner loading-lg"></div>

    <div class="pt-10" v-if="!isRoleCategoriesFetching && _roleCategories?.roleCategories">
      <!--If Some roles created-->
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20"
        v-if="_roleCategories.roleCategories.length != 0"
      >
        <RoleCategoryCard
          data-test="teamcard"
          v-for="roleCategory in _roleCategories.roleCategories"
          :key="roleCategory.id"
          :role-category="roleCategory"
          class="cursor-pointer"
          @click="navigateToRole(roleCategory.id)"
        />
        <div class="flex justify-center">
          <AddResourceCard
            @openAddResourceModal="showAddRoleCategoryModal = !showAddRoleCategoryModal"
            class="w-80 text-xl"
          />
        </div>
      </div>

      <!--If No roles created yet-->
      <div class="flex flex-col items-center" v-else>
        <img src="../assets/login-illustration.png" alt="Login illustration" width="300" />

        <span class="font-bold text-sm text-gray-500 my-4"
          >There are currently no roles your team, {{ useUserDataStore().name }}. Create a new role
          now!</span
        >

        <div class="flex justify-center">
          <AddResourceCard
            text="Add Role Category"
            @openAddResourceModal="showAddRoleCategoryModal = !showAddRoleCategoryModal"
            class="w-72 h-16 text-sm"
          />
        </div>
      </div>
    </div>

    <!--Error Display-->
    <div class="flex flex-col items-center pt-10" v-if="roleCategoryError">
      <img src="../assets/login-illustration.png" alt="Login illustration" width="300" />

      <div class="alert alert-warning">
        We are unable to retrieve your teams. Please try again in some time.
      </div>
    </div>

    <!--Modal-->
    <ModalComponent v-model="showAddRoleCategoryModal">
      <AddRoleCategoryForm
        :is-loading="false"
        :is-new="true"
        v-model="roleCategory"
        @close-modal="showAddRoleCategoryModal = !showAddRoleCategoryModal"
        @create-role-category="isFetch = !isFetch"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AddResourceCard from '@/components/AddResourceCard.vue'
import RoleCategoryCard from '@/components/roles/RoleCategoryCard.vue'
import AddRoleCategoryForm from '@/components/roles/AddRoleCategoryForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore } from '@/stores/user'
import { useCustomFetch } from '@/composables/useCustomFetch'
const router = useRouter()

const isRoleCategoriesFetching = ref(false)
const isFetch = ref(false)
const showAddRoleCategoryModal = ref(false)
const roleCategoryError = ref('')
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

const roleCategory = ref(initRoleCategory)

function navigateToRole(id: number | undefined) {
  if (id) router.push('/roles/' + id)
}

const { data: _roleCategories, execute: getRoleCategoriesAPI } = useCustomFetch('role-category', {
  immediate: false
})
  .get()
  .json()

onMounted(async () => {
  await getRoleCategoriesAPI()
})

watch(isFetch, async (newValue) => {
  if (newValue) {
    await getRoleCategoriesAPI()
    roleCategory.value.name = initRoleCategory.name
    roleCategory.value.description = initRoleCategory.description
    showAddRoleCategoryModal.value = false
    isFetch.value = false
  }
})
</script>

<style scoped></style>
@/composables/apis/team
