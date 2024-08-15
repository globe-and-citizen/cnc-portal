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
      class="p-4"
    >
      <label class="input input-bordered flex items-center gap-2 input-md">
        <select class="w-1/2 bg-white" v-model="role.role.roleCategoryId">
          <option value="0">-- Select Role Category --</option>
          <option 
            v-for="(roleCategory) of roleCategories"
            :key="roleCategory.id"
            :value="roleCategory.id"
          >
            {{ roleCategory?.name }}
          </option>
        </select>
        <select class="w-1/2 bg-white" v-model="role.roleId">
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

//#region helper functions
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