<template>
  <div class="min-h-screen flex flex-col items-center">
    <div>
      <h2 class="pt-10">Roles</h2>
    </div>

    <div v-if="isRoleCategoriesFetching" class="loading loading-spinner loading-lg"></div>

    <div class="pt-10" v-if="!isRoleCategoriesFetching && roleCategories">
      <!--If Some roles created-->
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20"
        v-if="roleCategories.length != 0"
      >
        <RoleCategoryCard
          data-test="teamcard"
          v-for="roleCategory in roleCategories"
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
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AddResourceCard from '@/components/AddResourceCard.vue'
import RoleCategoryCard from '@/components/roles/RoleCategoryCard.vue'
import AddRoleCategoryForm from '@/components/roles/AddRoleCategoryForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore } from '@/stores/user'
const router = useRouter()

const isRoleCategoriesFetching = ref(false)
type RoleCategory = { id: number; name: string; description?: string; creator: string }
const roleCategories = ref(Array<RoleCategory>())
const showAddRoleCategoryModal = ref(false)
const roleCategoryError = ref('')
const roleCategory = ref({
  name: '',
  description: '',
  roles: [
    {
      name: '',
      description: '',
      entitlements: [
        {
          type: 0,
          rule: ''
        }
      ]
    }
  ],
  entitlements: [
    {
      type: 0,
      rule: ''
    }
  ]
})

function navigateToRole(id: number) {
  router.push('/roles/' + id)
}
</script>

<style scoped></style>
@/composables/apis/team
