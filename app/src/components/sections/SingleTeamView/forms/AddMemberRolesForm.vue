<template>
<!--Heading-->
  <section class="mb-5">
    <h1 class="font-bold text-2xl">Role Details</h1>
    <hr class="mt-4" />
  </section>

<!--Body-->
  <section v-if="roleCategories">
    <div 
      v-for="(role, index) of memberRoles" :key="index"
      class="p-4 flex flex-col gap-2"
    >
      <label class="input input-bordered flex items-center gap-2 input-md">
        <select 
          class="w-1/2 bg-white" 
          v-model="role.role.roleCategoryId" 
          @input="async () => { await v$.$validate() }"
        >
          <option value="0">-- Select Role Category --</option>
          <option 
            v-for="(roleCategory) of roleCategories"
            :key="roleCategory.id"
            :value="roleCategory.id"
          >
            {{ roleCategory?.name }}
          </option>
        </select>
        <select 
          class="w-1/2 bg-white" 
          v-model="role.roleId" 
          @input="async () => { await v$.$validate() }"
        >
          <option value="0">-- Select Role --</option>
          <option
            v-for="(role, roleIndex) of getRoles(index)"
            :key="role?.id? role.id: roleIndex"
            :value="role?.id"
          >
            {{ role?.name }}
          </option>
        </select>
      </label>

      <FormErrorMessage v-if="v$.$errors.length">
        <div v-for="(message, index) of getErrors()" :key="index">
          {{ message }}
        </div>
      </FormErrorMessage>
    </div>
  </section>

<!--Add/Remove Buttons-->
  <section class="flex justify-end">
    <div
      class="w-6 h-6 cursor-pointer"
      @click="removeRole"
    >
      <MinusCircleIcon class="size-6" />
    </div>
    <div
      class="w-6 h-6 cursor-pointer"
      @click="addRole"
    >
      <PlusCircleIcon class="size-6" />
    </div>
  </section>

<!--Action Buttons-->
  <section class="modal-action justify-center">
    <LoadingButton v-if="isAddingRole" color="primary min-w-24" />
    <button v-else class="btn btn-primary" @click="emits('add-roles')">Add Roles</button>
    <button 
      class="btn btn-active"
      :disabled="isAddingRole"
      @click="emits('close-modal')"
    >
      Cancel
    </button>
  </section>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/outline'
import LoadingButton from "@/components/ui/LoadingButton.vue"
import { deepClone } from "@/utils"
import type { RoleCategory } from "@/types";
import { useVuelidate } from '@vuelidate/core'
import { helpers, minValue } from '@vuelidate/validators'
import FormErrorMessage from "@/components/ui/FormErrorMessage.vue";

//#region state
const props = defineProps<{
  isAddingRole: boolean;
  roleCategories: RoleCategory[]
}>()

const {roleCategories} = props

const initRole = {
  id: 0, 
  roleId: 0,
  role: { 
    roleCategoryId: 0
  }
}

const memberRoles = defineModel({
  default: [{
    id: 0, 
    roleId: 0,
    role: { 
      roleCategoryId: 0
    }
  }]
})

const emits = defineEmits(["add-roles", "close-modal"])
//#endregion state

//#region validation
const rules = {
  memberRoles: {
    $each: helpers.forEach({
      roleId: {
        minValue: helpers.withMessage('Role is required', minValue(1))
      },
      role: {
        isValid: helpers.withMessage(
          'Role category is required', 
          (value: {roleCategoryId: number}) => {
            return value.roleCategoryId > 0
          }
        )
      }
    })
  }
}

const v$ = useVuelidate(rules, { memberRoles })
//#endregion validation

//#region helper functions
const getErrors = () => {
  return v$.value.$errors[0].$message instanceof Array?
    v$.value.$errors[0].$message[0]:
    []
}
const getRoles = (index: number) => {
  const id = memberRoles.value[index].role.roleCategoryId
  const roleCategory = roleCategories.find((category: RoleCategory) => category.id === id)
  return roleCategory? roleCategory.roles: []
}

const addRole = () => {
  let role = memberRoles.value.find(role => parseInt(`${role.role.roleCategoryId}`) === 0)
  if(!role)
    memberRoles.value.push(deepClone(initRole));
};

const removeRole = () => {
  if (memberRoles.value.length > 1) {
    memberRoles.value.pop();
  }
};
//#endregion helper functions

watch(
  memberRoles, (newVal) => {
    if (newVal.length === 0) {
      memberRoles.value.push(deepClone(initRole));
    }
  },
  { immediate: true }
);
</script>