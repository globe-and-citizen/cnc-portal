<template>
  <div>
    <h1 class="font-bold text-2xl">{{ isNew ? 'Create' : 'Update' }} Role Category</h1>
    <hr class="mt-4" />
  </div>

  <div class="max-h-[70vh] overflow-y-auto p-2">
    <!--General Inputs-->
    <section class="flex flex-col gap-2">
      <label
        class="input input-bordered flex items-center gap-2 input-md mt-4"
        :class="{ 'input-error': $v.roleCategory.name.$errors.length }"
      >
        <span class="w-24">Name</span>
        <input
          type="text"
          class="grow"
          placeholder="Enter a role category name"
          v-model="roleCategory.name"
          @input="
            async () => {
              await $v.$validate()
            }
          "
        />
      </label>
      <FormErrorMessage v-if="$v.roleCategory.name.$errors.length">
        <div v-for="error of $v.roleCategory.name.$errors" :key="error.$uid">
          {{ error.$message }}
        </div>
      </FormErrorMessage>

      <label class="input input-bordered flex items-center gap-2 input-md">
        <span class="w-24">Description</span>
        <input
          type="text"
          class="grow"
          placeholder="Enter a short description"
          v-model="roleCategory.description"
        />
      </label>
    </section>

    <div v-if="props.isNew">
      <!--Roles-->
      <section class="mt-10">
        <div
          v-for="(input, index) in roleCategory.roles"
          :key="index"
          class="collapse collapse-plus bg-base-200 border mt-2"
        >
          <input type="radio" name="my-accordion-3" />
          <div class="collapse-title text-xl font-medium">
            Role - {{ input.name ? input.name : index + 1 }}
          </div>
          <div class="collapse-content">
            <AddRoleForm v-if="roleCategory.roles" v-model="roleCategory.roles[index]" />
          </div>
        </div>
      </section>

      <!--Roles Add Remove Roles Buttons-->
      <div class="flex justify-end pt-3">
        <div
          class="w-6 h-6 cursor-pointer"
          @click="
            () => {
              if (roleCategory.roles && roleCategory.roles.length > 1) {
                roleCategory.roles.pop()
              }
            }
          "
        >
          <MinusCircleIcon class="size-6" />
        </div>
        <div
          class="w-6 h-6 cursor-pointer"
          @click="
            () => {
              roleCategory?.roles?.push({
                name: '',
                description: '',
                entitlements: [
                  {
                    entitlementTypeId: 0,
                    value: ''
                  }
                ]
              })
            }
          "
        >
          <PlusCircleIcon class="size-6" />
        </div>
      </div>
    </div>

    <!--Role Category Entitlements-->
    <section class="join join-vertical w-full mt-10">
      <div
        v-for="(input, index) in roleCategory.entitlements"
        :key="index"
        class="collapse collapse-arrow join-item border-base-300 border"
      >
        <input type="radio" name="category-entitlement-accordion" />
        <div class="collapse-title text-l font-medium">
          Category Entitlement -
          {{ getEntitlementName(input.entitlementTypeId as unknown as number) ?? index + 1 }}
        </div>
        <div class="collapse-content">
          <AddEntitlementForm
            v-if="roleCategory.entitlements"
            v-model="roleCategory.entitlements[index]"
            :available-types="getAvailableTypes(index)"
          />
        </div>
      </div>
    </section>

    <!--Role Category Entitlements Add Remove Buttons-->
    <div class="flex justify-end pt-3">
      <div
        class="w-6 h-6 cursor-pointer"
        @click="
          () => {
            if (roleCategory.entitlements && roleCategory.entitlements.length > 1) {
              roleCategory.entitlements.pop()
            }
          }
        "
      >
        <MinusCircleIcon class="size-6" />
      </div>
      <div
        class="w-6 h-6 cursor-pointer"
        @click="
          () => {
            roleCategory?.entitlements?.push({
              entitlementTypeId: 0,
              value: ''
            })
          }
        "
      >
        <PlusCircleIcon class="size-6" />
      </div>
    </div>
  </div>
  <!--Submit Button-->
  <div class="modal-action justify-center">
    <!-- if there is a button in form, it will close the modal -->
    <LoadingButton v-if="isLoading" color="primary min-w-24" />
    <button class="btn btn-primary" @click="handleClickCreate" v-else-if="isNew">Create</button>
    <button v-else class="btn btn-primary" @click="handleClickUpdate">Update</button>
    <button class="btn btn-active" @click="emits('closeModal')">Cancel</button>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/outline'
import FormErrorMessage from '@/components/ui/FormErrorMessage.vue'
import LoadingButton from '@/components/ui/LoadingButton.vue'
import AddRoleForm from './AddRoleForm.vue'
import AddEntitlementForm from './AddEntitlementForm.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import type { RoleCategory } from '@/types'

const roleCategory = defineModel<RoleCategory>({
  default: {
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
})

//#region validation
const rules = {
  roleCategory: {
    name: { required }
  }
}

const $v = useVuelidate(rules, { roleCategory })
//#endregion validation

const roleCategoryEndPoint = ref('')

const {
  //isFetching: isCreateRoleCategoryFetching,
  //error: isCreateRoleCategoryError,
  execute: executeCreateRoleCategory /*,
  data: _roleCategory*/
} = useCustomFetch(`role-category/`, {
  immediate: false
})
  .post(roleCategory)
  .json()

const {
  //error: isGetEntTypesError,
  execute: executeFetchEntitlementTypes,
  data: _entTypes
} = useCustomFetch<{ success: boolean; entTypes: { id: number; name: string } }>(
  `entitlement/types`,
  {
    immediate: false
  }
)
  .get()
  .json()

const { execute: executeUpdateRoleCategory } = useCustomFetch(roleCategoryEndPoint, {
  immediate: false
})
  .put(roleCategory)
  .json()

const getAvailableTypes = (index: number) => {
  return computed(() => {
    const selectedTypes = roleCategory.value.entitlements?.map(
      (entitlement) => entitlement.entitlementTypeId
    )

    return _entTypes.value?.entTypes.filter(
      (type: { id: number; name: string }) =>
        type.id === -1 ||
        !selectedTypes?.includes(type.id) ||
        (roleCategory.value.entitlements &&
          roleCategory.value.entitlements[index].entitlementTypeId === type.id)
    )
  })
}

const getEntitlementName = (typeId: number) => {
  const entitlement = _entTypes.value?.entTypes.find(
    (ent: { id: number; name: string }) => ent.id === typeId
  )
  return entitlement ? entitlement.name : undefined
}

const handleClickCreate = async () => {
  await $v.value.$validate()
  if ($v.value.$errors.length) {
    console.log('Errors found, aborting submission: ', $v.value)
    return
  }
  await executeCreateRoleCategory()
  emits('createRoleCategory')
}

const handleClickUpdate = async () => {
  roleCategoryEndPoint.value = `role-category`
  await executeUpdateRoleCategory()
  emits('closeModal')
  emits('reload')
}

const emits = defineEmits(['createRoleCategory', 'searchUsers', 'closeModal', 'reload'])
const props = defineProps<{
  isNew?: boolean
  categoryId?: number
  isLoading: boolean
}>()

onMounted(async () => {
  await executeFetchEntitlementTypes()
})
</script>
